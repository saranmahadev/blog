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
 * The only way a comment is created. Checks the reader is signed in with a verified email, validates the
 * text and parent, rate-limits, and always stores the comment as "pending" for review.
 */
export const postComment = functions.region('asia-south1').https.onCall(async (data, context) => {
  const fail = functions.https.HttpsError;
  if (!context.auth) throw new fail('unauthenticated', 'Sign in to comment.');
  if (!context.auth.token.email_verified) throw new fail('failed-precondition', 'Verify your email to comment.');
  const uid = context.auth.uid;

  const postKey = typeof data?.postKey === 'string' ? data.postKey : '';
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(postKey) || postKey.length > 120) throw new fail('invalid-argument', 'Unknown post.');
  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (body.length < 1 || body.length > COMMENT_MAX) throw new fail('invalid-argument', `Comments are 1 to ${COMMENT_MAX} characters.`);
  if ((body.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) throw new fail('invalid-argument', `Please include at most ${MAX_LINKS} links.`);

  const db = getFirestore();
  let parentId: string | null = null;
  if (data?.parentId != null) {
    if (typeof data.parentId !== 'string') throw new fail('invalid-argument', 'Bad reply target.');
    const parent = await db.doc(`comments/${data.parentId}`).get();
    const p = parent.data();
    // One level of replies: the parent must be a published, top-level comment on the same post.
    if (!p || p.postKey !== postKey || p.parentId != null || p.status !== 'published') throw new fail('failed-precondition', 'That comment can no longer be replied to.');
    parentId = parent.id;
  }

  const recent = await db.collection('comments').where('authorId', '==', uid).orderBy('createdAt', 'desc').limit(HOURLY_LIMIT).get();
  const times = recent.docs.map((d) => d.get('createdAt')?.toMillis?.() ?? 0);
  if (times[0] && Date.now() - times[0] < MIN_GAP_MS) throw new fail('resource-exhausted', 'Please wait a moment before posting again.');
  if (times.length >= HOURLY_LIMIT && Date.now() - times[HOURLY_LIMIT - 1] < 3_600_000) throw new fail('resource-exhausted', 'You have posted a lot recently. Try again later.');

  const profile = await db.doc(`users/${uid}`).get();
  const authorName = String(profile.get('displayName') || context.auth.token.name || 'Reader').slice(0, 40);

  const ref = await db.collection('comments').add({
    postKey, parentId, authorId: uid, authorName, body,
    status: 'pending' as const,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});
