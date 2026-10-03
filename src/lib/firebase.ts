// Firebase client, loaded on demand so pages that never sign anyone in ship none of it.
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

const env = import.meta.env;

export const firebaseConfigured = Boolean(env.PUBLIC_FIREBASE_API_KEY && env.PUBLIC_FIREBASE_PROJECT_ID);
const useEmulators = env.PUBLIC_USE_EMULATORS === 'true';
const projectId: string = env.PUBLIC_FIREBASE_PROJECT_ID ?? '';

/** The plain web endpoint used to hand over unsynced data while a page is closing (see sync.ts). */
export const beaconUrl = () => useEmulators ? `http://127.0.0.1:5001/${projectId}/asia-south1/syncBeacon` : `https://asia-south1-${projectId}.cloudfunctions.net/syncBeacon`;

let app: Promise<FirebaseApp> | undefined;
let auth: Promise<Auth> | undefined;
let db: Promise<Firestore> | undefined;
let fns: Promise<Functions> | undefined;

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
    // No popup/redirect resolver: email and password need none, and without it the SDK does not load Google's
    // apis.google.com script or open a hidden auth iframe, so the page's Content-Security-Policy can stay tight.
    const instance = m.initializeAuth(a, { persistence: [m.indexedDBLocalPersistence, m.browserLocalPersistence] });
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

export function getFunctionsClient() {
  fns ??= Promise.all([getApp(), import('firebase/functions')]).then(([a, m]) => {
    const instance = m.getFunctions(a, 'asia-south1');
    if (useEmulators) m.connectFunctionsEmulator(instance, '127.0.0.1', 5001);
    return instance;
  });
  return fns;
}
