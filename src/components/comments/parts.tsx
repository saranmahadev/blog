import { useState, type FormEvent } from 'react';
import { initialOf, useAuth } from '@/lib/auth';
import { getDb, getFunctionsClient } from '@/lib/firebase';

// Comments are private: each thread is a conversation between one reader and the author.
export type Comment = {
  id: string; parentId: string | null; replyToId: string | null; threadOwnerId: string; authorId: string;
  authorName: string; authorRole: string; body: string; createdAt: Date | null; postKey?: string;
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

export const callMessage = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  const known = ['resource-exhausted', 'invalid-argument', 'failed-precondition', 'permission-denied', 'already-exists'];
  if (known.some((k) => e?.code?.includes(k))) return (e.message || '').replace(/^.*?: /, '').replace(/ \[\d+\]$/, '') || 'Could not send your message.';
  if (e?.code?.includes('unauthenticated')) return 'Sign in to comment.';
  return 'Could not send your message. Try again.';
};

// The connection dropped or timed out: the request may or may not have reached the server.
export const isNetworkError = (err: unknown) => /internal|unavailable|deadline-exceeded|unknown/.test((err as { code?: string })?.code ?? '');


/** Only the author replies. A reader may answer the author's replies, in the thread they started. */
export function canReplyTo(opts: { canPost: boolean; isAuthor: boolean; me?: string }, c: Comment, thread: Comment) {
  return opts.canPost && (opts.isAuthor || (opts.me === thread.threadOwnerId && c.authorRole === 'admin' && c.id !== thread.id));
}

export function Composer({ postKey, parentId, replyToId, name, email, compact, onDone }: { postKey: string; parentId?: string; replyToId?: string | null; name: string; email: string; compact?: boolean; onDone: (msg: string) => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { user } = useAuth();
  const id = `cm-${replyToId ?? parentId ?? 'new'}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setErr('Write something first.');
    setBusy(true); setErr('');
    // One id per send: if the connection drops, retrying with the same id cannot create a duplicate.
    const clientId = crypto.randomUUID().replace(/-/g, '');
    const send = async () => {
      const [fns, m] = await Promise.all([getFunctionsClient(), import('firebase/functions')]);
      await m.httpsCallable(fns, 'postComment')({ postKey, body, parentId: parentId ?? null, replyToId: replyToId ?? null, clientId });
    };
    try {
      await user?.getIdToken(true); // the server checks the verified-email claim in the token
      try { await send(); }
      catch (e1) {
        if (!isNetworkError(e1)) throw e1;
        await new Promise((r) => setTimeout(r, 1500));
        await send(); // same clientId
      }
      setBody('');
      onDone(parentId ? 'Sent.' : 'Sent. Only you and the author can see this.');
    } catch (e2) {
      if (isNetworkError(e2)) { onDone('We could not confirm that your message was sent. It may have gone through: check the list below before sending again.'); }
      else setErr(callMessage(e2));
    }
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

export function Item({ c, me, isAuthor, canReply, onReply, onChanged, setNote }: {
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
