import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { initialOf, useAuth, useRole } from '@/lib/auth';
import { firebaseConfigured, getDb, getFunctionsClient } from '@/lib/firebase';

type Comment = {
  id: string; parentId: string | null; replyToId: string | null; authorId: string; authorName: string; authorRole: string;
  body: string; status: 'pending' | 'published' | 'hidden'; createdAt: Date | null;
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
  if (e?.code?.includes('resource-exhausted') || e?.code?.includes('invalid-argument') || e?.code?.includes('failed-precondition')) return (e.message || '').replace(/^.*?: /, '').replace(/ \[\d+\]$/, '') || 'Could not post your comment.';
  if (e?.code?.includes('unauthenticated')) return 'Sign in to comment.';
  return 'Could not post your comment. Try again.';
};

export default function Comments({ postKey }: { postKey: string }) {
  const { status, user } = useAuth();
  const [items, setItems] = useState<Comment[] | null>(null);
  const role = useRole(user);
  const isAuthor = role === 'admin';
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      const col = m.collection(db, 'comments');
      const queries = [m.getDocs(m.query(col, m.where('postKey', '==', postKey), m.where('status', '==', 'published'), m.orderBy('createdAt', 'desc')))];
      if (user) queries.push(m.getDocs(m.query(col, m.where('postKey', '==', postKey), m.where('authorId', '==', user.uid), m.orderBy('createdAt', 'desc'))));
      const seen = new Map<string, Comment>();
      for (const snap of await Promise.all(queries)) {
        for (const d of snap.docs) {
          const x = d.data();
          seen.set(d.id, { id: d.id, parentId: x.parentId ?? null, replyToId: x.replyToId ?? null, authorRole: x.authorRole ?? 'user', authorId: x.authorId, authorName: x.authorName, body: x.body, status: x.status, createdAt: x.createdAt?.toDate?.() ?? null });
        }
      }
      setItems([...seen.values()].sort((a, b) => (b.createdAt?.getTime() ?? Date.now()) - (a.createdAt?.getTime() ?? Date.now())));
    } catch { setItems([]); }
  }, [postKey, user]);

  useEffect(() => { if (status !== 'loading') load(); }, [status, load]);

  // A comment is checked automatically within seconds: keep looking until our pending ones resolve.
  const waiting = (items ?? []).some((c) => c.status === 'pending' && c.authorId === user?.uid);
  useEffect(() => {
    if (!waiting || polls >= 8) return;
    const t = setTimeout(() => { setPolls(polls + 1); load(); }, 3000);
    return () => clearTimeout(t);
  }, [waiting, polls, load]);

  if (!firebaseConfigured) return null;

  const top = (items ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (items ?? []).filter((c) => c.parentId === id).sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
  const publishedCount = (items ?? []).filter((c) => c.status === 'published').length;
  const canPost = status === 'in' && user?.emailVerified;
  // Only the author replies. A reader may answer the author's replies, and only in the thread they started.
  const canReplyTo = (c: Comment, thread: Comment) =>
    !!canPost && c.status === 'published' && (isAuthor || (user?.uid === thread.authorId && c.authorRole === 'admin' && c.id !== thread.id));
  const here = typeof location === 'undefined' ? '/' : location.pathname;

  return (
    <section id="comments" aria-labelledby="cm-h" className="cm" data-pagefind-ignore>
      <div className="row cm-head">
        <h2 id="cm-h" className="disp" style={{ fontSize: 52, margin: 0 }}>Comments</h2>
        <span className="pill on">{publishedCount}</span>
        <span className="sp" /><span className="meta">Newest first</span>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>Comments are checked automatically. Only the author replies, and you can answer back in your own thread.</p>

      {status === 'out' && (
        <div className="slab tone-lilac cm-cta">
          <strong className="head" style={{ fontSize: 20 }}>Sign in to join the conversation.</strong>
          <span className="sp" />
          <a className="btn" href={`/register/?next=${encodeURIComponent(here)}`}>Create account</a>
          <a className="btn ink" href={`/login/?next=${encodeURIComponent(here)}`}>Sign in</a>
        </div>
      )}
      {status === 'in' && !user?.emailVerified && (
        <div className="slab tone-sky cm-cta">
          <strong className="head" style={{ fontSize: 20 }}>Verify your email to comment.</strong>
          <span className="sp" />
          <a className="btn ink" href="/profile/">Go to your profile</a>
        </div>
      )}
      {canPost && <Composer postKey={postKey} name={user?.displayName ?? ''} email={user?.email ?? ''} onDone={(t) => { setNote({ kind: 'ok', text: t }); setPolls(0); load(); }} />}

      <div role="status" aria-live="polite">{note && <p className={`cm-note ${note.kind}`}>{note.text}</p>}</div>

      {items === null && <p className="serif muted" style={{ marginTop: 24 }}>Loading comments…</p>}
      {items !== null && top.length === 0 && <p className="serif muted" style={{ marginTop: 24 }}>No comments yet. Be the first.</p>}
      {top.map((c) => (
        <div key={c.id}>
          <Item c={c} me={user?.uid} canReply={canReplyTo(c, c)} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onChanged={load} setNote={setNote} canReport={!!canPost} />
          {replyTo === c.id && canPost && (
            <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={null} name={user?.displayName ?? ''} email={user?.email ?? ''} compact onDone={(t) => { setReplyTo(null); setNote({ kind: 'ok', text: t }); setPolls(0); load(); }} /></div>
          )}
          {repliesOf(c.id).map((r) => (
            <div key={r.id}>
              <div className="cm-reply"><Item c={r} me={user?.uid} canReply={canReplyTo(r, c)} onReply={() => setReplyTo(replyTo === r.id ? null : r.id)} onChanged={load} setNote={setNote} canReport={!!canPost} /></div>
              {replyTo === r.id && canPost && (
                <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={r.id} name={user?.displayName ?? ''} email={user?.email ?? ''} compact onDone={(t) => { setReplyTo(null); setNote({ kind: 'ok', text: t }); setPolls(0); load(); }} /></div>
              )}
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
  const id = `cm-${replyToId ?? parentId ?? 'new'}`;
  const { user } = useAuth();
  const isAuthorNow = useRole(user) === 'admin';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setErr('Write something first.');
    setBusy(true); setErr('');
    try {
      // The server checks the verified-email claim in the token, so make sure the token is current.
      await user?.getIdToken(true);
      const [fns, m] = await Promise.all([getFunctionsClient(), import('firebase/functions')]);
      await m.httpsCallable(fns, 'postComment')({ postKey, body, parentId: parentId ?? null, replyToId: replyToId ?? null });
      setBody('');
      onDone(isAuthorNow ? 'Posted.' : 'Thanks. Your comment is being checked and usually appears within a few seconds.');
    } catch (e2) { setErr(callMessage(e2)); }
    setBusy(false);
  }

  return (
    <form className="cm-form" onSubmit={submit}>
      <span className="av tone-sky" aria-hidden="true">{initialOf(name, email)}</span>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor={id}>{parentId ? 'Reply' : 'Add a comment'}</label>
        <textarea className="inp" id={id} maxLength={2000} placeholder="Be specific and kind." value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={`${id}-h`} style={compact ? { minHeight: 80 } : undefined} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="hint" id={`${id}-h`}>{body.length} / 2000</span>
          <span className="sp" />
          <button className="btn accent" type="submit" disabled={busy}>{busy ? 'Posting…' : parentId ? 'Post reply' : 'Post comment'}</button>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
      </div>
    </form>
  );
}

function Item({ c, me, canReply, canReport, onReply, onChanged, setNote }: {
  c: Comment; me?: string; canReply: boolean; canReport: boolean; onReply: () => void; onChanged: () => void; setNote: (n: { kind: 'ok' | 'err'; text: string }) => void;
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
      await m.updateDoc(m.doc(db, 'comments', c.id), { body: t, status: 'pending', updatedAt: m.serverTimestamp() });
      setEditing(false);
      setNote({ kind: 'ok', text: 'Saved. Your edited comment is being checked again.' });
      onChanged();
    } catch { setNote({ kind: 'err', text: 'Could not save your edit.' }); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm('Delete this comment?')) return;
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      await m.deleteDoc(m.doc(db, 'comments', c.id));
      onChanged();
    } catch { setNote({ kind: 'err', text: 'Could not delete the comment.' }); }
  }
  async function report() {
    const reason = prompt('What is wrong with this comment? (optional, 200 characters)') ;
    if (reason === null) return;
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      await m.setDoc(m.doc(db, 'reports', `${c.id}_${me}`), { commentId: c.id, reporterId: me, reason: reason.slice(0, 200), createdAt: m.serverTimestamp() });
      setNote({ kind: 'ok', text: 'Thanks. We will take a look.' });
    } catch { setNote({ kind: 'ok', text: 'You have already reported this comment.' }); }
  }

  return (
    <div className={`cmt${c.status === 'pending' ? ' pend' : ''}`}>
      <span className={`av tone-${toneOf(c.authorId)}`} aria-hidden="true">{initialOf(c.authorName)}</span>
      <div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{c.authorName}</strong>
          {c.authorRole === 'admin' && <span className="badge tone-accent">Author</span>}
          {c.status === 'pending' && <span className="badge tone-rose">Being checked</span>}
          {c.status === 'hidden' && <span className="badge tone-rose">Not published</span>}
          <span className="meta">{ago(c.createdAt)}</span>
        </div>
        {editing ? (
          <form onSubmit={save} className="stack" style={{ gap: 10, marginTop: 8 }}>
            <label className="sr" htmlFor={`e-${c.id}`}>Edit comment</label>
            <textarea className="inp" id={`e-${c.id}`} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row" style={{ gap: 8 }}><button className="btn sm accent" type="submit" disabled={busy}>Save</button><button className="btn sm ghost" type="button" onClick={() => { setEditing(false); setText(c.body); }}>Cancel</button></div>
          </form>
        ) : (
          <p className="cm-body">{c.body}</p>
        )}
        {c.status === 'pending' && mine && !editing && <p className="hint" style={{ marginTop: 4 }}>Only you can see this until it has been checked.</p>}
        {c.status === 'hidden' && mine && !editing && <p className="hint" style={{ marginTop: 4 }}>This comment was not published because it looks like spam or breaks the guidelines. You can edit it and it will be checked again.</p>}
        {!editing && (
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            {canReply && <button className="btn sm" type="button" onClick={onReply}>Reply</button>}
            {mine && <button className="btn sm" type="button" onClick={() => setEditing(true)}>Edit</button>}
            {mine && <button className="btn sm ghost" type="button" onClick={remove}>Delete</button>}
            {!mine && canReport && c.status === 'published' && <button className="btn sm ghost" type="button" onClick={report}>Report</button>}
          </div>
        )}
      </div>
    </div>
  );
}
