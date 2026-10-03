import { useEffect, useState, type FormEvent } from 'react';
import { authMessage, initialOf, useAuth } from '@/lib/auth';
import { firebaseConfigured, getAuthClient } from '@/lib/firebase';
import { setTheme } from '@/lib/sync';
import { useSync } from '@/lib/useSync';
import SyncStatus from '@/components/sync/SyncStatus';
import Library, { type PostInfo } from '@/components/library/Library';

const THEME_LABEL = { light: 'Light', system: 'System', dark: 'Dark' } as const;

export default function Profile({ posts }: { posts: PostInfo[] }) {
  const { status, user } = useAuth();
  const sync = useSync();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pw, setPw] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { if (user) setName(user.displayName ?? ''); }, [user]);

  // Signed out (or accounts not set up): the bookmarks saved on this device are still here, with a way to sign in.
  if (!firebaseConfigured || status === 'out') {
    return (
      <div className="prof">
        <h1 className="disp" style={{ fontSize: 'clamp(56px,9vw,120px)' }}>Bookmarks</h1>
        <p className="serif muted" style={{ fontSize: 20, maxWidth: '46ch', marginTop: 12 }}>Saved on this device.{firebaseConfigured && ' Sign in to keep them on your account and see them on your other devices.'}</p>
        {firebaseConfigured && !leaving && (
          <div className="row" style={{ gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <a className="btn ink" href={`/login/?next=${encodeURIComponent('/profile/')}`}>Sign in</a>
            <a className="btn" href="/register/?next=%2Fprofile%2F">Create account</a>
          </div>
        )}
        <section id="bookmarks" aria-label="Bookmarks"><Library posts={posts} showStatus={false} /></section>
      </div>
    );
  }
  if (status !== 'in' || !user) return <p className="serif muted" role="status">Loading your profile…</p>;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg(null);
    const n = name.trim();
    if (n.length < 1 || n.length > 40) return setMsg({ kind: 'err', text: 'Pick a name between 1 and 40 characters.' });
    setBusy(true);
    try {
      const a = await import('firebase/auth');
      await a.updateProfile(user, { displayName: n });
      await user.getIdToken(true); // so the new name is on the next message you send
      setMsg({ kind: 'ok', text: 'Saved.' });
    } catch (err) { setMsg({ kind: 'err', text: authMessage(err) }); }
    setBusy(false);
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

      <p className="mono" style={{ marginTop: 10 }}>{user.emailVerified ? 'Email verified' : 'Email not verified: use the bar at the top of the page to send a verification email.'}</p>

      <section id="bookmarks" aria-label="Bookmarks" style={{ marginTop: 32 }}>
        <h2 className="mono rule" style={{ paddingTop: 12 }}>Bookmarks</h2>
        <Library posts={posts} showStatus={false} />
      </section>

      <form className="stack" style={{ gap: 16, marginTop: 40, maxWidth: 520 }} onSubmit={save}>
        <h2 className="mono rule" style={{ paddingTop: 12 }}>Name</h2>
        <div className="field"><label htmlFor="p-name">Username</label><input className="inp" id="p-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /><span className="hint">Shown to the author next to your messages. Nobody else can see them.</span></div>
        <div className="row" style={{ gap: 10 }}><button className="btn ink" type="submit" disabled={busy}>Save name</button></div>
      </form>

      <div role="status" aria-live="polite" style={{ marginTop: 16, minHeight: 28 }}>
        {msg && <span className={msg.kind === 'ok' ? 'badge tone-mint' : 'err'}>{msg.text}</span>}
      </div>

      <section style={{ marginTop: 40, maxWidth: 520 }} aria-label="Preferences">
        <h2 className="mono rule" style={{ paddingTop: 12, marginBottom: 14 }}>Preferences</h2>
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><strong>Theme</strong><div className="hint">System follows your device.</div></div>
          <div className="seg" role="group" aria-label="Theme">
            {(['light', 'system', 'dark'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={(sync.local.s.t ?? 'system') === t} className={(sync.local.s.t ?? 'system') === t ? 'on' : ''} onClick={() => setTheme(t)}>{THEME_LABEL[t]}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 10 }}><SyncStatus /></div>
      </section>

      <section style={{ marginTop: 40, maxWidth: 520 }} aria-label="Account">
        <h2 className="mono rule" style={{ paddingTop: 12, marginBottom: 14 }}>Account</h2>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={signOut}>Sign out</button>
          {!confirmDelete && <button className="btn ghost" type="button" onClick={() => setConfirmDelete(true)}>Delete my account</button>}
        </div>
        {confirmDelete && (
          <form className="slab" style={{ padding: 20, marginTop: 18 }} onSubmit={remove}>
            <div className="head" style={{ fontSize: 20 }}>Delete your account?</div>
            <p className="serif" style={{ margin: '6px 0 14px' }}>This removes your sign-in, your saved bookmarks and progress, and every message you wrote or started. It cannot be undone. Enter your password to confirm.</p>
            <div className="field"><label htmlFor="p-del">Password</label><input className="inp" id="p-del" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="row" style={{ gap: 10, marginTop: 14 }}><button className="btn danger" type="submit" disabled={busy || pw.length < 1}>Delete account</button><button className="btn ghost" type="button" onClick={() => { setConfirmDelete(false); setPw(''); }}>Cancel</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
