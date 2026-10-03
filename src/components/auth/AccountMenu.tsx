import { useEffect, useRef, useState } from 'react';
import { initialOf, useAuth } from '@/lib/auth';
import { useSync } from '@/lib/useSync';
import { firebaseConfigured, getAuthClient } from '@/lib/firebase';

export default function AccountMenu() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const { unread } = useSync();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!firebaseConfigured) return null;
  if (status === 'loading') return <span className="ib" aria-hidden="true" style={{ visibility: 'hidden' }} />;
  if (status === 'out') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <a className="btn ink sm" href={`/login/?next=${next}`}>Sign in</a>;
  }

  const name = user?.displayName || user?.email?.split('@')[0] || 'Reader';
  async function signOut() {
    const [client, m] = await Promise.all([getAuthClient(), import('firebase/auth')]);
    await m.signOut(client);
    setOpen(false);
  }
  return (
    <div className="acct" ref={root}>
      <button className="row clay acct-btn" type="button" aria-label={`Account menu for ${name}${unread > 0 ? `, ${unread} new in your inbox` : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="av tone-sky" style={{ boxShadow: 'none' }} aria-hidden="true">{initialOf(user?.displayName, user?.email)}</span>
        <strong className="acct-name">{name}</strong><span aria-hidden="true">▾</span>
        {unread > 0 && <span className="acct-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="slab acct-menu" role="menu" aria-label="Account menu">
          <div className="row" style={{ padding: '10px 10px 14px', gap: 12 }}>
            <span className="av tone-sky" aria-hidden="true">{initialOf(user?.displayName, user?.email)}</span>
            <div style={{ minWidth: 0 }}><strong>{name}</strong><div className="mono muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.emailVerified ? 'Verified' : 'Email not verified'}</div></div>
          </div>
          <a className="row acct-item" role="menuitem" href="/inbox/">Inbox {unread > 0 && <span className="badge tone-accent" style={{ marginLeft: 'auto' }}>{unread} new</span>}</a>
          <a className="row acct-item" role="menuitem" href="/profile/#bookmarks">Bookmarks</a>
          <a className="row acct-item" role="menuitem" href="/profile/">Profile</a>
          <button className="row acct-item" role="menuitem" type="button" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
