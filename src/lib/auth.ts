// Auth helpers shared by the sign-in islands. Everything loads Firebase on demand (see firebase.ts).
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { firebaseConfigured, getAuthClient } from './firebase';

export type AuthState = { status: 'loading' | 'out' | 'in'; user: User | null };

/** Current user. Stays `loading` until Firebase has read the saved session. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: firebaseConfigured ? 'loading' : 'out', user: null });
  useEffect(() => {
    if (!firebaseConfigured) return;
    let off = () => {};
    let stopped = false;
    (async () => {
      const [auth, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
      if (stopped) return;
      off = m.onAuthStateChanged(auth, (user) => {
        setState({ status: user ? 'in' : 'out', user });
        // Someone who verified in another tab: pick that up (and a fresh token for the rules) without a manual step.
        if (user && !user.emailVerified) {
          user.reload().then(async () => {
            if (user.emailVerified && !stopped) { await user.getIdToken(true); setState({ status: 'in', user }); }
          }).catch(() => {});
        }
      });
    })();
    return () => { stopped = true; off(); };
  }, []);
  return state;
}

/** Plain-language messages for Firebase auth errors. Never reveals whether an email is registered. */
export function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'That email and password do not match.';
    case 'auth/invalid-email': return 'Enter a full address, like name@example.com.';
    case 'auth/email-already-in-use': return 'An account with that email may already exist. Try signing in, or reset your password.';
    case 'auth/weak-password': return 'Use at least 8 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Could not reach the server. Check your connection.';
    case 'auth/requires-recent-login': return 'For your security, sign in again and retry.';
    default: return 'Something went wrong. Please try again.';
  }
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/profile/';
}

export const initialOf = (name: string | null | undefined, email?: string | null) =>
  (name?.trim()[0] ?? email?.[0] ?? '?').toUpperCase();
