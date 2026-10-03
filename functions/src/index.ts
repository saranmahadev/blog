import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';

initializeApp();

/**
 * Deleting an account deletes its data: the profile, every message the person wrote, and every thread they
 * started (including the author's replies inside those threads, which exist only for that conversation).
 */
export const onUserDeleted = functions.region('asia-south1').auth.user().onDelete(async (user) => {
  const db = getFirestore();
  const [written, owned] = await Promise.all([
    db.collection('comments').where('authorId', '==', user.uid).get(),
    db.collection('comments').where('threadOwnerId', '==', user.uid).get(),
  ]);
  const writer = db.bulkWriter();
  const seen = new Set<string>();
  for (const d of [...written.docs, ...owned.docs]) {
    if (!seen.has(d.ref.path)) { seen.add(d.ref.path); void writer.delete(d.ref); }
  }
  void writer.delete(db.doc(`users/${user.uid}`));
  await writer.close();
});

const COMMENT_MAX = 2000;
const MAX_LINKS = 2;
const MIN_GAP_MS = 30_000;
const HOURLY_LIMIT = 10;

/**
 * The only way a comment is created. Comments are private conversations between one reader and the author:
 *  - a verified reader starts a thread (a top-level comment);
 *  - only the author (role "admin") replies to a thread, and the reader who started it can answer the author's replies;
 *  - every message carries `threadOwnerId` (the reader), and the rules show a thread only to that reader and the author.
 * There is nothing to approve: the author sees every thread on a post right away. Obvious spam is refused here.
 */
export const postComment = functions.region('asia-south1').https.onCall(async (data, context) => {
  const fail = functions.https.HttpsError;
  if (!context.auth) throw new fail('unauthenticated', 'Sign in to comment.');
  if (!context.auth.token.email_verified) throw new fail('failed-precondition', 'Verify your email to comment.');
  const uid = context.auth.uid;
  const isAuthor = context.auth.token.role === 'admin';

  // A retry after a dropped connection sends the same clientId and gets the original answer instead of a duplicate.
  const clientId = typeof data?.clientId === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(data.clientId) ? data.clientId : null;
  const docRef = clientId ? getFirestore().doc(`comments/${uid}_${clientId}`) : null;
  if (docRef && (await docRef.get()).exists) return { id: docRef.id, duplicate: true };

  const postKey = typeof data?.postKey === 'string' ? data.postKey : '';
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(postKey) || postKey.length > 120) throw new fail('invalid-argument', 'Unknown post.');
  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (body.length < 1 || body.length > COMMENT_MAX) throw new fail('invalid-argument', `Comments are 1 to ${COMMENT_MAX} characters.`);
  if (!isAuthor) {
    if ((body.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) throw new fail('invalid-argument', `Please include at most ${MAX_LINKS} links.`);
    if (/(.)\1{14,}/s.test(body)) throw new fail('invalid-argument', 'That looks like spam. Please write a normal message.');
  }

  const db = getFirestore();
  let threadId: string | null = null;
  let threadOwnerId = uid;
  let replyToId: string | null = null;
  if (data?.parentId != null) {
    if (typeof data.parentId !== 'string') throw new fail('invalid-argument', 'Bad reply target.');
    const top = await db.doc(`comments/${data.parentId}`).get();
    const t = top.data();
    if (!t || t.postKey !== postKey || t.parentId != null) throw new fail('failed-precondition', 'That comment can no longer be replied to.');
    threadId = top.id;
    threadOwnerId = t.threadOwnerId;
    if (!isAuthor) {
      if (threadOwnerId !== uid) throw new fail('permission-denied', 'Only the author replies to comments.');
      // The reader may only answer one of the author's own replies in their thread.
      const target = typeof data.replyToId === 'string' ? await db.doc(`comments/${data.replyToId}`).get() : null;
      const r = target?.data();
      if (!r || r.parentId !== threadId || r.authorRole !== 'admin') throw new fail('permission-denied', 'You can reply to the author\'s replies in your own thread.');
      replyToId = target!.id;
    } else if (typeof data.replyToId === 'string') {
      const target = await db.doc(`comments/${data.replyToId}`).get();
      if (target.exists && target.get('parentId') === threadId) replyToId = target.id;
    }
  } else if (isAuthor) {
    throw new fail('failed-precondition', 'Reply to a reader\'s comment. Comments are private conversations.');
  }

  if (!isAuthor) {
    const recent = await db.collection('comments').where('authorId', '==', uid).orderBy('createdAt', 'desc').limit(HOURLY_LIMIT).get();
    const times = recent.docs.map((d) => d.get('createdAt')?.toMillis?.() ?? 0);
    if (times[0] && Date.now() - times[0] < MIN_GAP_MS) throw new fail('resource-exhausted', 'Please wait a moment before posting again.');
    if (times.length >= HOURLY_LIMIT && Date.now() - times[HOURLY_LIMIT - 1] < 3_600_000) throw new fail('resource-exhausted', 'You have posted a lot recently. Try again later.');
    if (recent.docs.some((d) => d.get('body') === body && d.get('postKey') === postKey)) throw new fail('already-exists', 'You already sent that message.');
  }

  // The name comes from the sign-in record (no profile document to read).
  const authorName = String(context.auth.token.name || context.auth.token.email?.split('@')[0] || 'Reader').slice(0, 40);

  const doc = {
    postKey, parentId: threadId, replyToId, threadOwnerId, authorId: uid, authorName,
    authorRole: isAuthor ? 'admin' : 'user',
    body,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (docRef) {
    try { await docRef.create(doc); } catch (err) { if ((err as { code?: number }).code !== 6) throw err; } // 6 = already created by a parallel retry
    return { id: docRef.id };
  }
  const ref = await db.collection('comments').add(doc);
  return { id: ref.id };
});


// ---- reader state: hand-over while a page is closing ----------------------------------------------
const KEY = /^[a-z0-9~-]{1,120}$/;

/** Turns what a browser sends into a safe Firestore merge. Anything unexpected is ignored, never trusted. */
export function cleanState(x: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const entries = (o: unknown) => (o && typeof o === 'object' ? Object.entries(o as Record<string, unknown>).slice(0, 200) : []);
  const b: Record<string, unknown> = {};
  for (const [k, v] of entries(x?.b)) if (KEY.test(k)) { if (v === null) b[k] = FieldValue.delete(); else if (typeof v === 'number' && Number.isFinite(v)) b[k] = Math.trunc(v); }
  const p: Record<string, number> = {};
  for (const [k, v] of entries(x?.p)) if (KEY.test(k) && typeof v === 'number' && Number.isFinite(v)) p[k] = Math.max(0, Math.min(100, Math.round(v)));
  const s: Record<string, string> = {};
  for (const [k, v] of entries(x?.s)) if (k === 't' && (v === 'light' || v === 'dark' || v === 'system')) s[k] = v;
  if (Object.keys(b).length) out.b = b;
  if (Object.keys(p).length) out.p = p;
  if (Object.keys(s).length) out.s = s;
  if (x?.n0 === true) out.n = 0;
  return out;
}

/**
 * Receives a reader's unsynced changes while their page is closing (sendBeacon cannot set headers, so the sign-in
 * token travels in the body). Answers nothing useful: the browser does not wait for it. The usual sync repeats the
 * same field-level writes later, so a duplicate does no harm.
 */
export const syncBeacon = functions.region('asia-south1').runWith({ maxInstances: 5 }).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.set('Access-Control-Allow-Headers', 'content-type').status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).send(''); return; }
  try {
    const raw = req.rawBody?.toString('utf8') ?? '';
    if (raw.length === 0 || raw.length > 32_000) { res.status(413).send(''); return; }
    const body = JSON.parse(raw);
    const decoded = await getAuth().verifyIdToken(String(body?.token ?? ''));
    const state = cleanState(body?.state);
    if (Object.keys(state).length) await getFirestore().doc(`users/${decoded.uid}`).set(state, { merge: true });
    res.status(204).send('');
  } catch (err) {
    functions.logger.warn('syncBeacon rejected', { error: String(err) });
    res.status(400).send('');
  }
});
