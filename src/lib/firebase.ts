// Firebase client, loaded on demand so pages that never sign anyone in ship none of it.
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfigured = Boolean(env.PUBLIC_FIREBASE_API_KEY && env.PUBLIC_FIREBASE_PROJECT_ID);
const useEmulators = env.PUBLIC_USE_EMULATORS === 'true';

let app: Promise<FirebaseApp> | undefined;
let auth: Promise<Auth> | undefined;
let db: Promise<Firestore> | undefined;

function getApp() {
  app ??= import('firebase/app').then(({ initializeApp, getApps }) => {
    if (!firebaseConfigured) throw new Error('Firebase is not configured (see .env.example).');
    return getApps()[0] ?? initializeApp({
      apiKey: env.PUBLIC_FIREBASE_API_KEY,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
      appId: env.PUBLIC_FIREBASE_APP_ID,
    });
  });
  return app;
}

export function getAuthClient() {
  auth ??= Promise.all([getApp(), import('firebase/auth')]).then(([a, m]) => {
    const instance = m.getAuth(a);
    if (useEmulators) m.connectAuthEmulator(instance, 'http://127.0.0.1:9099', { disableWarnings: true });
    return instance;
  });
  return auth;
}

export function getDb() {
  db ??= Promise.all([getApp(), import('firebase/firestore')]).then(([a, m]) => {
    const instance = m.getFirestore(a);
    if (useEmulators) m.connectFirestoreEmulator(instance, '127.0.0.1', 8080);
    return instance;
  });
  return db;
}
