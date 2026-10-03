import { useEffect, useState, type FormEvent } from 'react';
import { authMessage, initialOf, useAuth } from '@/lib/auth';
import { firebaseConfigured, getAuthClient, getDb } from '@/lib/firebase';
import { ensureProfile } from './AuthForm';

export default function Profile() {
  const { status, user } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pw, setPw] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (status === 'out' && firebaseConfigured && !leaving) location.replace(`/login/?next=${encodeURIComponent('/profile/')}`);
  }, [status, leaving]);

  useEffect(() => {
    if (!user) return;
    setName(user.displayName ?? '');
    (async () => {
      try {
        const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
        const ref = m.doc(db, 'users', user.uid);
        let snap = await m.getDoc(ref);
        if (!snap.exists()) { await ensureProfile(user.uid, user.email, user.displayName || user.email?.split('@')[0] || 'Reader'); snap = await m.getDoc(ref); }
        if (snap.exists()) { setName(snap.data().displayName ?? user.displayName ?? ''); setBio(snap.data().bio ?? ''); }
      } catch { /* profile document not created yet */ }
      setLoaded(true);
    })();
  }, [user]);

  if (!firebaseConfigured) return <p className="serif muted">Accounts are not set up yet.</p>;
  if (status !== 'in' || !user) return <p className="serif muted" role="status">Loading your profile…</p>;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg(null);
    const n = name.trim();
    if (n.length < 1 || n.length > 40) return setMsg({ kind: 'err', text: 'Pick a name between 1 and 40 characters.' });
    setBusy(true);
    try {
      const [db, fs, a] = await Promise.all([getDb(), import('firebase/firestore'), import('firebase/auth')]);
      await a.updateProfile(user, { displayName: n });
      await fs.updateDoc(fs.doc(db, 'users', user.uid), { displayName: n, bio: bio.trim() });
      setMsg({ kind: 'ok', text: 'Saved.' });
    } catch { setMsg({ kind: 'err', text: 'Could not save. Please try again.' }); }
    setBusy(false);
  }

  async function verify() {
    if (!user) return;
    try { const a = await import('firebase/auth'); await a.sendEmailVerification(user); setMsg({ kind: 'ok', text: `Verification email sent to ${user.email}.` }); }
    catch (err) { setMsg({ kind: 'err', text: authMessage(err) }); }
  }

  async function refresh() {
    if (!user) return;
    await user.reload();
    setMsg({ kind: user.emailVerified ? 'ok' : 'err', text: user.emailVerified ? 'Your email is verified.' : 'Not verified yet. Open the link in the email first.' });
    // Pull a fresh token so the verified flag reaches the security rules.
    await user.getIdToken(true);
  }

  async function signOut() {
    const [client, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
    setLeaving(true);
    await m.signOut(client);
    location.assign('/');
  }

  async function remove(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setBusy(true); setMsg(null);
    try {
      const a = await import('firebase/auth');
      await a.reauthenticateWithCredential(user, a.EmailAuthProvider.credential(user.email, pw));
      setLeaving(true);
      await a.deleteUser(user);
      location.assign('/');
    } catch (err) { setLeaving(false); setMsg({ kind: 'err', text: authMessage(err) }); setBusy(false); }
  }

  return (
    <div className="prof">
      <div className="row" style={{ gap: 20 }}>
        <span className="av lg tone-sky" aria-hidden="true">{initialOf(name, user.email)}</span>
        <div style={{ minWidth: 0 }}>
          <h1 className="disp" style={{ fontSize: 'clamp(40px,6vw,72px)', overflowWrap: 'anywhere' }}>{name || 'Your profile'}</h1>
          <div className="mono muted" style={{ overflowWrap: 'anywhere' }}>{user.email}</div>
        </div>
      </div>

      {!user.emailVerified && (
        <section className="slab tone-sky" style={{ padding: 20, marginTop: 28 }} aria-label="Verify your email">
          <div className="head" style={{ fontSize: 22 }}>Verify your email to comment</div>
          <p className="serif" style={{ margin: '6px 0 14px' }}>We sent a link to {user.email}. Open it, then check again here.</p>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={refresh}>I have verified</button>
            <button className="btn ghost" type="button" onClick={verify}>Resend email</button>
          </div>
        </section>
      )}

      <form className="stack" style={{ gap: 16, marginTop: 32, maxWidth: 520 }} onSubmit={save}>
        <h2 className="mono rule" style={{ paddingTop: 12 }}>Public profile</h2>
        <div className="field"><label htmlFor="p-name">Username</label><input className="inp" id="p-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /><span className="hint">Shown next to your comments.</span></div>
        <div className="field"><label htmlFor="p-bio">Bio</label><textarea className="inp" id="p-bio" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} disabled={!loaded} /><span className="hint">{bio.length} / 280</span></div>
        <div className="row" style={{ gap: 10 }}><button className="btn ink" type="submit" disabled={busy || !loaded}>Save changes</button></div>
      </form>

      <div role="status" aria-live="polite" style={{ marginTop: 16, minHeight: 28 }}>
        {msg && <span className={msg.kind === 'ok' ? 'badge tone-mint' : 'err'}>{msg.text}</span>}
      </div>

      <section style={{ marginTop: 40, maxWidth: 520 }} aria-label="Account">
        <h2 className="mono rule" style={{ paddingTop: 12, marginBottom: 14 }}>Account</h2>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={signOut}>Sign out</button>
          {!confirmDelete && <button className="btn ghost" type="button" onClick={() => setConfirmDelete(true)}>Delete my account</button>}
        </div>
        {confirmDelete && (
          <form className="slab" style={{ padding: 20, marginTop: 18 }} onSubmit={remove}>
            <div className="head" style={{ fontSize: 20 }}>Delete your account?</div>
            <p className="serif" style={{ margin: '6px 0 14px' }}>This removes your profile and sign-in. It cannot be undone. Enter your password to confirm.</p>
            <div className="field"><label htmlFor="p-del">Password</label><input className="inp" id="p-del" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="row" style={{ gap: 10, marginTop: 14 }}><button className="btn danger" type="submit" disabled={busy || pw.length < 1}>Delete account</button><button className="btn ghost" type="button" onClick={() => { setConfirmDelete(false); setPw(''); }}>Cancel</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
