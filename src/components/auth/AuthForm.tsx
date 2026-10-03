import { useEffect, useState, type FormEvent } from 'react';
import { authMessage, safeNext, useAuth } from '@/lib/auth';
import { firebaseConfigured, getAuthClient, getDb } from '@/lib/firebase';

type Mode = 'login' | 'register' | 'reset';

const COPY = {
  login: { title: 'Sign in', lead: 'Bookmark posts, like them and join the comments.', cta: 'Sign in' },
  register: { title: 'Create account', lead: 'It takes a minute. No password rules to memorise.', cta: 'Create account' },
  reset: { title: 'Reset password', lead: 'We will email you a link to choose a new one.', cta: 'Send reset link' },
} as const;

export default function AuthForm({ mode }: { mode: Mode }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errField, setErrField] = useState<'email' | 'password' | 'username' | ''>('');
  const [done, setDone] = useState<'reset' | 'verify' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [next, setNext] = useState('/profile/');

  useEffect(() => { setNext(safeNext(new URLSearchParams(location.search).get('next'))); }, []);
  // Already signed in: nothing to do here (except on the register screen while we show "verify").
  useEffect(() => { if (auth.status === 'in' && !done) location.replace(next); }, [auth.status, done, next]);

  if (!firebaseConfigured) {
    return <div className="dlg"><h1 className="disp" style={{ fontSize: 44 }}>Accounts are not set up yet</h1><p className="serif muted" style={{ marginTop: 12 }}>Sign-in will appear here once the site is connected to its backend.</p></div>;
  }

  const fail = (field: typeof errField, msg: string) => { setErrField(field); setError(msg); setBusy(false); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setErrField('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('email', 'Enter a full address, like name@example.com.');
    if (mode !== 'reset' && password.length < 8) return fail('password', 'Use at least 8 characters.');
    if (mode === 'register' && (username.trim().length < 1 || username.trim().length > 40)) return fail('username', 'Pick a name between 1 and 40 characters.');
    setBusy(true);
    try {
      const [client, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
      if (mode === 'login') {
        await m.signInWithEmailAndPassword(client, email.trim(), password);
        location.assign(next);
      } else if (mode === 'register') {
        const cred = await m.createUserWithEmailAndPassword(client, email.trim(), password);
        await m.updateProfile(cred.user, { displayName: username.trim() });
        await m.sendEmailVerification(cred.user);
        await ensureProfile(cred.user.uid, cred.user.email, username.trim()).catch(() => {});
        setDone('verify'); setBusy(false);
      } else {
        // Same message whether or not the address exists, so this cannot be used to probe for accounts.
        try { await m.sendPasswordResetEmail(client, email.trim()); } catch (err) { if ((err as { code?: string }).code === 'auth/invalid-email') throw err; }
        setDone('reset'); setBusy(false);
      }
    } catch (err) {
      fail((err as { code?: string }).code?.includes('password') ? 'password' : 'email', authMessage(err));
    }
  }

  async function resend() {
    setBusy(true); setError('');
    try {
      const [client, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
      if (client.currentUser) await m.sendEmailVerification(client.currentUser);
    } catch (err) { setError(authMessage(err)); }
    setBusy(false);
  }

  if (done === 'verify') {
    return (
      <section className="dlg tone-mint" aria-label="Verify email">
        <div className="mono">Check your inbox</div>
        <h1 className="disp" style={{ fontSize: 48, margin: '8px 0 12px' }}>Verify your email</h1>
        <p className="serif" style={{ fontSize: 18 }}>We sent a link to {email.trim()}. Open it to finish setting up, then you can comment.</p>
        {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="row" style={{ marginTop: 18, gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={resend} disabled={busy}>Resend email</button>
          <a className="btn ghost" href="/profile/">Continue to your profile</a>
        </div>
      </section>
    );
  }
  if (done === 'reset') {
    return (
      <section className="dlg tone-mint" aria-label="Reset link sent">
        <div className="mono">Check your inbox</div>
        <h1 className="disp" style={{ fontSize: 44, margin: '8px 0 12px' }}>Link on its way</h1>
        <p className="serif" style={{ fontSize: 18 }}>If an account exists for {email.trim()}, a reset link is on its way. It can take a minute.</p>
        <a className="btn" href="/login/" style={{ marginTop: 18 }}>Back to sign in</a>
      </section>
    );
  }

  const c = COPY[mode];
  return (
    <section className="dlg" aria-labelledby="auth-title">
      <h1 id="auth-title" className="disp" style={{ fontSize: 56 }}>{c.title}</h1>
      <p className="serif muted" style={{ fontSize: 18, margin: '10px 0 22px' }}>{c.lead}</p>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="a-user">Username</label>
            <input className="inp" id="a-user" autoComplete="nickname" maxLength={40} value={username} onChange={(e) => setUsername(e.target.value)} aria-invalid={errField === 'username'} aria-describedby="a-user-h" />
            {errField === 'username' ? <span className="err" role="alert" id="a-user-h">{error}</span> : <span className="hint" id="a-user-h">Shown next to your comments.</span>}
          </div>
        )}
        <div className="field">
          <label htmlFor="a-email">Email</label>
          <input className="inp" id="a-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errField === 'email'} aria-describedby={errField === 'email' ? 'a-email-e' : undefined} />
          {errField === 'email' && <span className="err" role="alert" id="a-email-e">{error}</span>}
        </div>
        {mode !== 'reset' && (
          <div className="field">
            <label htmlFor="a-pass">Password</label>
            <input className="inp" id="a-pass" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={errField === 'password'} aria-describedby="a-pass-h" />
            {errField === 'password' ? <span className="err" role="alert" id="a-pass-h">{error}</span> : <span className="hint" id="a-pass-h">{mode === 'register' ? 'At least 8 characters.' : <a href="/reset/" style={{ textDecoration: 'underline' }}>Forgot your password?</a>}</span>}
          </div>
        )}
        {error && !errField && <p className="err" role="alert">{error}</p>}
        <button className="btn ink block" type="submit" disabled={busy}>{busy ? 'One moment…' : c.cta}</button>
      </form>
      <p className="hint" style={{ marginTop: 18, textAlign: 'center' }}>
        {mode === 'login' && <>New here? <a href={`/register/${next !== '/profile/' ? `?next=${encodeURIComponent(next)}` : ''}`} style={{ textDecoration: 'underline', fontWeight: 700 }}>Create an account</a></>}
        {mode === 'register' && <>Already have an account? <a href="/login/" style={{ textDecoration: 'underline', fontWeight: 700 }}>Sign in</a></>}
        {mode === 'reset' && <a href="/login/" style={{ textDecoration: 'underline', fontWeight: 700 }}>Back to sign in</a>}
      </p>
    </section>
  );
}

/** Create the profile document the rules allow a reader to create for themselves. Safe to call twice. */
export async function ensureProfile(uid: string, email: string | null, displayName: string) {
  const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
  const ref = m.doc(db, 'users', uid);
  if ((await m.getDoc(ref)).exists()) return;
  await m.setDoc(ref, { displayName: displayName.slice(0, 40), email, role: 'user', bio: '', preferences: {}, createdAt: m.serverTimestamp() });
}
