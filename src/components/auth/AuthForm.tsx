import { useEffect, useState, type FormEvent } from 'react';
import { authMessage, safeNext, useAuth } from '@/lib/auth';
import { firebaseConfigured, getAuthClient } from '@/lib/firebase';

/** Passwords people try first. Not exhaustive; length is the real protection. */
const COMMON = new Set(['password', 'password1', 'password123', '1234567890', '12345678910', 'qwertyuiop', 'qwerty12345', 'iloveyou123', 'letmein1234', 'welcome1234', 'admin12345', 'abcdefghij', '0123456789', 'passw0rd123', 'changeme123', 'monkey12345', 'dragon12345', 'football123', 'baseball123', 'princess123']);

type Mode = 'login' | 'register' | 'reset';

const COPY = {
  login: { title: 'Sign in', lead: 'Keep your bookmarks on every device and write privately to the author.', cta: 'Sign in' },
  register: { title: 'Create account', lead: 'It takes a minute. Use a long password, not a clever one.', cta: 'Create account' },
  reset: { title: 'Reset password', lead: 'We will email you a link to choose a new one.', cta: 'Send reset link' },
} as const;

export default function AuthForm({ mode }: { mode: Mode }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errField, setErrField] = useState<'email' | 'password' | 'username' | 'age' | ''>('');
  const [done, setDone] = useState<'reset' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [adult, setAdult] = useState(false);
  const [next, setNext] = useState('/profile/');

  useEffect(() => { setNext(safeNext(new URLSearchParams(location.search).get('next'))); }, []);
  // Already signed in: nothing to do here (except on the register screen while we show "verify").
  useEffect(() => { if (auth.status === 'in' && !done && !busy) location.replace(next); }, [auth.status, done, busy, next]);

  if (!firebaseConfigured) {
    return <div className="dlg"><h1 className="disp" style={{ fontSize: 44 }}>Accounts are not set up yet</h1><p className="serif muted" style={{ marginTop: 12 }}>Sign-in will appear here once the site is connected to its backend.</p></div>;
  }

  const fail = (field: typeof errField, msg: string) => { setErrField(field); setError(msg); setBusy(false); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setErrField('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('email', 'Enter a full address, like name@example.com.');
    if (mode === 'login' && password.length < 1) return fail('password', 'Enter your password.');
    if (mode === 'register') {
      const name = email.trim().split('@')[0].toLowerCase();
      if (password.length < 10) return fail('password', 'Use at least 10 characters.');
      if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password) || (name.length > 3 && password.toLowerCase().includes(name))) return fail('password', 'That password is too easy to guess. Try a few unrelated words.');
    }
    if (mode === 'register' && (username.trim().length < 1 || username.trim().length > 40)) return fail('username', 'Pick a name between 1 and 40 characters.');
    if (mode === 'register' && !adult) return fail('age', 'You must be 18 or older to create an account.');
    setBusy(true);
    try {
      const [client, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
      if (mode === 'login') {
        await m.signInWithEmailAndPassword(client, email.trim(), password);
        location.assign(next);
      } else if (mode === 'register') {
        const cred = await m.createUserWithEmailAndPassword(client, email.trim(), password);
        await m.updateProfile(cred.user, { displayName: username.trim() });
        await cred.user.getIdToken(true); // so the name is on the sign-in token the server reads
        location.assign(next); // no email is sent automatically; the banner at the top offers to send one
      } else {
        // Same message whether or not the address exists, so this cannot be used to probe for accounts.
        try { await m.sendPasswordResetEmail(client, email.trim()); } catch (err) { if ((err as { code?: string }).code === 'auth/invalid-email') throw err; }
        setDone('reset'); setBusy(false);
      }
    } catch (err) {
      fail((err as { code?: string }).code?.includes('password') ? 'password' : 'email', authMessage(err));
    }
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
            {errField === 'password' ? <span className="err" role="alert" id="a-pass-h">{error}</span> : <span className="hint" id="a-pass-h">{mode === 'register' ? 'At least 10 characters. A few unrelated words is ideal.' : <a href="/reset/" style={{ textDecoration: 'underline' }}>Forgot your password?</a>}</span>}
          </div>
        )}
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="a-age" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 400 }}>
              <input id="a-age" type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} aria-required="true" aria-invalid={errField === 'age'} aria-describedby={errField === 'age' ? 'a-age-h' : undefined} style={{ marginTop: 4 }} />
              <span>I am 18 or older, and I agree to the <a href="/terms/" style={{ textDecoration: 'underline' }}>terms</a> and <a href="/privacy/" style={{ textDecoration: 'underline' }}>privacy policy</a>.</span>
            </label>
            {errField === 'age' && <span className="err" role="alert" id="a-age-h">{error}</span>}
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
