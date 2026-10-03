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
  await getFirestore().doc(`users/${user.uid}`).set({
    displayName: displayNameFrom(user.displayName, user.email),
    email: user.email ?? null,
    role: 'user' satisfies Role,
    bio: '',
    preferences: {},
    createdAt: FieldValue.serverTimestamp(),
  });
});

/** Profile cleanup when an account is deleted (the data-deletion promise). */
export const onUserDeleted = functions.region('asia-south1').auth.user().onDelete(async (user) => {
  await getFirestore().doc(`users/${user.uid}`).delete();
});
