import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';

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

  const profile = await db.doc(`users/${uid}`).get();
  const authorName = String(profile.get('displayName') || context.auth.token.name || 'Reader').slice(0, 40);

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
