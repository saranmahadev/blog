import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { askJev, bodyHash } from './moderation';

initializeApp();

export type Role = 'user' | 'author' | 'moderator' | 'admin';

const displayNameFrom = (name: string | undefined, email: string | undefined) =>
  (name?.trim() || email?.split('@')[0] || 'Reader').slice(0, 40);

/** Every new account gets a profile document and the default role claim. Clients cannot write either. */
export const onUserCreated = functions.region('asia-south1').auth.user().onCreate(async (user) => {
  await getAuth().setCustomUserClaims(user.uid, { role: 'user' satisfies Role });
  // The client usually creates its own profile first; never overwrite it.
  await getFirestore().doc(`users/${user.uid}`).create({
    displayName: displayNameFrom(user.displayName, user.email),
    email: user.email ?? null,
    role: 'user' satisfies Role,
    bio: '',
    preferences: {},
    createdAt: FieldValue.serverTimestamp(),
  }).catch((err: { code?: number }) => { if (err.code !== 6) throw err; }); // 6 = ALREADY_EXISTS
});

/** Profile cleanup when an account is deleted (the data-deletion promise). */
export const onUserDeleted = functions.region('asia-south1').auth.user().onDelete(async (user) => {
  await getFirestore().doc(`users/${user.uid}`).delete();
});

const COMMENT_MAX = 2000;
const MAX_LINKS = 2;
const MIN_GAP_MS = 30_000;
const HOURLY_LIMIT = 10;
const SECRETS = ['TYPESAFE_API_KEY'];

/**
 * The only way a comment is created. Threads work like this:
 *  - any verified reader can start a thread (top-level comment);
 *  - only the author (role "admin") replies to a thread, and the one reader who started it can answer back
 *    to the author's replies. Nobody else can post in someone else's thread.
 * Reader comments are stored as "pending" and published or hidden by the moderation trigger below.
 * The author's own comments are published immediately.
 */
export const postComment = functions.region('asia-south1').https.onCall(async (data, context) => {
  const fail = functions.https.HttpsError;
  if (!context.auth) throw new fail('unauthenticated', 'Sign in to comment.');
  if (!context.auth.token.email_verified) throw new fail('failed-precondition', 'Verify your email to comment.');
  const uid = context.auth.uid;
  const isAuthor = context.auth.token.role === 'admin';

  const postKey = typeof data?.postKey === 'string' ? data.postKey : '';
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(postKey) || postKey.length > 120) throw new fail('invalid-argument', 'Unknown post.');
  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (body.length < 1 || body.length > COMMENT_MAX) throw new fail('invalid-argument', `Comments are 1 to ${COMMENT_MAX} characters.`);
  if (!isAuthor && (body.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) throw new fail('invalid-argument', `Please include at most ${MAX_LINKS} links.`);

  const db = getFirestore();
  let threadId: string | null = null;
  let replyToId: string | null = null;
  if (data?.parentId != null) {
    if (typeof data.parentId !== 'string') throw new fail('invalid-argument', 'Bad reply target.');
    const top = await db.doc(`comments/${data.parentId}`).get();
    const t = top.data();
    if (!t || t.postKey !== postKey || t.parentId != null || t.status !== 'published') throw new fail('failed-precondition', 'That comment can no longer be replied to.');
    threadId = top.id;
    if (!isAuthor) {
      if (t.authorId !== uid) throw new fail('permission-denied', 'Only the author replies to comments.');
      // The thread starter may only answer one of the author\'s own published replies.
      const target = typeof data.replyToId === 'string' ? await db.doc(`comments/${data.replyToId}`).get() : null;
      const r = target?.data();
      if (!r || r.parentId !== threadId || r.authorRole !== 'admin' || r.status !== 'published') throw new fail('permission-denied', 'You can reply to the author\'s replies in your own thread.');
      replyToId = target!.id;
    } else if (typeof data.replyToId === 'string') {
      const target = await db.doc(`comments/${data.replyToId}`).get();
      if (target.exists && target.get('parentId') === threadId) replyToId = target.id;
    }
  }

  if (!isAuthor) {
    const recent = await db.collection('comments').where('authorId', '==', uid).orderBy('createdAt', 'desc').limit(HOURLY_LIMIT).get();
    const times = recent.docs.map((d) => d.get('createdAt')?.toMillis?.() ?? 0);
    if (times[0] && Date.now() - times[0] < MIN_GAP_MS) throw new fail('resource-exhausted', 'Please wait a moment before posting again.');
    if (times.length >= HOURLY_LIMIT && Date.now() - times[HOURLY_LIMIT - 1] < 3_600_000) throw new fail('resource-exhausted', 'You have posted a lot recently. Try again later.');
  }

  const profile = await db.doc(`users/${uid}`).get();
  const authorName = String(profile.get('displayName') || context.auth.token.name || 'Reader').slice(0, 40);

  const ref = await db.collection('comments').add({
    postKey, parentId: threadId, replyToId, authorId: uid, authorName,
    authorRole: isAuthor ? 'admin' : 'user',
    body,
    status: isAuthor ? ('published' as const) : ('pending' as const),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

/** Run Jev on a pending comment and publish, hide or leave it for the author. Skips if the text changed meanwhile. */
async function moderate(ref: FirebaseFirestore.DocumentReference, text: string) {
  const hash = bodyHash(text);
  try {
    const j = await askJev(text, process.env.TYPESAFE_API_KEY ?? '');
    await ref.firestore.runTransaction(async (tx) => {
      const cur = await tx.get(ref);
      if (!cur.exists || cur.get('status') !== 'pending' || bodyHash(cur.get('body') ?? '') !== hash) return; // edited or already handled
      tx.update(ref, {
        status: j.verdict === 'approve' ? 'published' : j.verdict === 'reject' ? 'hidden' : 'pending',
        modFor: hash, modVerdict: j.verdict, modConfidence: j.confidence, modAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    // Jev unreachable or an unexpected answer: leave it pending. The sweep below tries again.
    functions.logger.warn('moderation failed', { id: ref.id, error: String(err) });
  }
}

export const moderateComment = functions.region('asia-south1').runWith({ secrets: SECRETS }).firestore
  .document('comments/{id}').onWrite(async (change) => {
    if (!change.after.exists) return;
    const c = change.after.data()!;
    if (c.status !== 'pending' || c.authorRole === 'admin' || typeof c.body !== 'string') return;
    if (c.modFor === bodyHash(c.body)) return; // already judged; waiting for the author
    await moderate(change.after.ref, c.body);
  });

/** Safety net: retry comments that are still unjudged (for example, Jev was down when they arrived). */
export const moderationSweep = functions.region('asia-south1').runWith({ secrets: SECRETS }).pubsub
  .schedule('every 30 minutes').onRun(async () => {
    const snap = await getFirestore().collection('comments').where('status', '==', 'pending').orderBy('createdAt', 'asc').limit(50).get();
    for (const d of snap.docs) {
      const c = d.data();
      if (c.authorRole !== 'admin' && typeof c.body === 'string' && c.modFor !== bodyHash(c.body)) await moderate(d.ref, c.body);
    }
  });
