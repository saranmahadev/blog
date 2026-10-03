import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { initialOf, useAuth, useRole } from '@/lib/auth';
import { firebaseConfigured, getDb, getFunctionsClient } from '@/lib/firebase';

// Comments are private: each thread is a conversation between one reader and the author.
type Comment = {
  id: string; parentId: string | null; replyToId: string | null; threadOwnerId: string; authorId: string;
  authorName: string; authorRole: string; body: string; createdAt: Date | null;
};

const TONES = ['sky', 'lilac', 'mint', 'rose'];
const toneOf = (id: string) => TONES[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % TONES.length];

function ago(d: Date | null) {
  if (!d) return 'Just now';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const callMessage = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  const known = ['resource-exhausted', 'invalid-argument', 'failed-precondition', 'permission-denied', 'already-exists'];
  if (known.some((k) => e?.code?.includes(k))) return (e.message || '').replace(/^.*?: /, '').replace(/ \[\d+\]$/, '') || 'Could not send your message.';
  if (e?.code?.includes('unauthenticated')) return 'Sign in to comment.';
  return 'Could not send your message. Try again.';
};

export default function Comments({ postKey }: { postKey: string }) {
  const { status, user } = useAuth();
  const role = useRole(user);
  const isAuthor = role === 'admin';
  const [items, setItems] = useState<Comment[] | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      const col = m.collection(db, 'comments');
      // The author sees every thread on the post; a reader sees only their own.
      const q = isAuthor
        ? m.query(col, m.where('postKey', '==', postKey), m.orderBy('createdAt', 'desc'))
        : m.query(col, m.where('postKey', '==', postKey), m.where('threadOwnerId', '==', user.uid), m.orderBy('createdAt', 'desc'));
      const snap = await m.getDocs(q);
      setItems(snap.docs.map((d) => {
        const x = d.data();
        return { id: d.id, parentId: x.parentId ?? null, replyToId: x.replyToId ?? null, threadOwnerId: x.threadOwnerId, authorId: x.authorId, authorName: x.authorName, authorRole: x.authorRole ?? 'user', body: x.body, createdAt: x.createdAt?.toDate?.() ?? null };
      }));
    } catch { setItems([]); }
  }, [postKey, user, isAuthor]);

  useEffect(() => { if (status === 'out') setItems([]); else if (status === 'in') load(); }, [status, load]);

  if (!firebaseConfigured) return null;

  const top = (items ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (items ?? []).filter((c) => c.parentId === id).sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
  const canPost = status === 'in' && user?.emailVerified;
  // Only the author replies. A reader may answer the author's replies, in the thread they started.
  const canReplyTo = (c: Comment, thread: Comment) => !!canPost && (isAuthor || (user?.uid === thread.threadOwnerId && c.authorRole === 'admin' && c.id !== thread.id));
  const here = typeof location === 'undefined' ? '/' : location.pathname;
  const done = (text: string) => { setReplyTo(null); setNote(text); load(); };

  return (
    <section id="comments" aria-labelledby="cm-h" className="cm" data-pagefind-ignore>
      <div className="row cm-head">
        <h2 id="cm-h" className="disp" style={{ fontSize: 52, margin: 0 }}>Comments</h2>
        <span className="pill">Private</span>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        {isAuthor ? 'You see every reader’s conversation on this post. Reply to continue it.' : 'Only you and the author can see what you write here. The author replies, and you can answer back.'}
      </p>

      {status === 'out' && (
        <div className="slab tone-lilac cm-cta">
          <strong className="head" style={{ fontSize: 20 }}>Sign in to write to the author.</strong>
          <span className="sp" />
          <a className="btn" href={`/register/?next=${encodeURIComponent(here)}`}>Create account</a>
          <a className="btn ink" href={`/login/?next=${encodeURIComponent(here)}`}>Sign in</a>
        </div>
      )}
      {status === 'in' && !user?.emailVerified && (
        <div className="slab tone-sky cm-cta">
          <strong className="head" style={{ fontSize: 20 }}>Verify your email to comment.</strong>
          <span className="sp" />
          <a className="btn ink" href="#verify-banner">Send verification email</a>
        </div>
      )}
      {canPost && !isAuthor && <Composer postKey={postKey} name={user?.displayName ?? ''} email={user?.email ?? ''} onDone={done} />}

      <div role="status" aria-live="polite">{note && <p className="cm-note">{note}</p>}</div>

      {status === 'in' && items === null && <p className="serif muted" style={{ marginTop: 24 }}>Loading…</p>}
      {status === 'in' && items !== null && top.length === 0 && <p className="serif muted" style={{ marginTop: 24 }}>{isAuthor ? 'No reader messages on this post yet.' : 'Nothing yet. Say something to the author.'}</p>}
      {top.map((c) => (
        <div key={c.id}>
          <Item c={c} me={user?.uid} isAuthor={isAuthor} canReply={canReplyTo(c, c)} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onChanged={load} setNote={setNote} />
          {replyTo === c.id && canPost && <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={null} name={user?.displayName ?? ''} email={user?.email ?? ''} compact onDone={done} /></div>}
          {repliesOf(c.id).map((r) => (
            <div key={r.id}>
              <div className="cm-reply"><Item c={r} me={user?.uid} isAuthor={isAuthor} canReply={canReplyTo(r, c)} onReply={() => setReplyTo(replyTo === r.id ? null : r.id)} onChanged={load} setNote={setNote} /></div>
              {replyTo === r.id && canPost && <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={r.id} name={user?.displayName ?? ''} email={user?.email ?? ''} compact onDone={done} /></div>}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function Composer({ postKey, parentId, replyToId, name, email, compact, onDone }: { postKey: string; parentId?: string; replyToId?: string | null; name: string; email: string; compact?: boolean; onDone: (msg: string) => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { user } = useAuth();
  const id = `cm-${replyToId ?? parentId ?? 'new'}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setErr('Write something first.');
    setBusy(true); setErr('');
    try {
      await user?.getIdToken(true); // the server checks the verified-email claim in the token
      const [fns, m] = await Promise.all([getFunctionsClient(), import('firebase/functions')]);
      await m.httpsCallable(fns, 'postComment')({ postKey, body, parentId: parentId ?? null, replyToId: replyToId ?? null });
      setBody('');
      onDone(parentId ? 'Sent.' : 'Sent. Only you and the author can see this.');
    } catch (e2) { setErr(callMessage(e2)); }
    setBusy(false);
  }

  return (
    <form className="cm-form" onSubmit={submit}>
      <span className="av tone-sky" aria-hidden="true">{initialOf(name, email)}</span>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor={id}>{parentId ? 'Reply' : 'Write to the author'}</label>
        <textarea className="inp" id={id} maxLength={2000} placeholder="Be specific and kind." value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={`${id}-h`} style={compact ? { minHeight: 80 } : undefined} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="hint" id={`${id}-h`}>{body.length} / 2000</span>
          <span className="sp" />
          <button className="btn accent" type="submit" disabled={busy}>{busy ? 'Sending…' : parentId ? 'Send reply' : 'Send'}</button>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
      </div>
    </form>
  );
}

function Item({ c, me, isAuthor, canReply, onReply, onChanged, setNote }: {
  c: Comment; me?: string; isAuthor: boolean; canReply: boolean; onReply: () => void; onChanged: () => void; setNote: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.body);
  const [busy, setBusy] = useState(false);
  const mine = me === c.authorId;

  async function save(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || t.length > 2000) return;
    setBusy(true);
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      await m.updateDoc(m.doc(db, 'comments', c.id), { body: t, updatedAt: m.serverTimestamp() });
      setEditing(false); setNote('Saved.'); onChanged();
    } catch { setNote('Could not save your edit.'); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm('Delete this message?')) return;
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      await m.deleteDoc(m.doc(db, 'comments', c.id));
      onChanged();
    } catch { setNote('Could not delete the message.'); }
  }

  return (
    <div className="cmt">
      <span className={`av tone-${toneOf(c.authorId)}`} aria-hidden="true">{initialOf(c.authorName)}</span>
      <div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{c.authorName}</strong>
          {c.authorRole === 'admin' && <span className="badge tone-accent">Author</span>}
          <span className="meta">{ago(c.createdAt)}</span>
        </div>
        {editing ? (
          <form onSubmit={save} className="stack" style={{ gap: 10, marginTop: 8 }}>
            <label className="sr" htmlFor={`e-${c.id}`}>Edit message</label>
            <textarea className="inp" id={`e-${c.id}`} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row" style={{ gap: 8 }}><button className="btn sm accent" type="submit" disabled={busy}>Save</button><button className="btn sm ghost" type="button" onClick={() => { setEditing(false); setText(c.body); }}>Cancel</button></div>
          </form>
        ) : (
          <p className="cm-body">{c.body}</p>
        )}
        {!editing && (
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            {canReply && <button className="btn sm" type="button" onClick={onReply}>Reply</button>}
            {mine && <button className="btn sm" type="button" onClick={() => setEditing(true)}>Edit</button>}
            {(mine || isAuthor) && <button className="btn sm ghost" type="button" onClick={remove}>Delete</button>}
          </div>
        )}
      </div>
    </div>
  );
}
