import { useEffect, useState, type FormEvent } from 'react';
import { initialOf } from '@/lib/auth';
import { deleteMessage, discardMessage, editMessage, editQueued, queueMessage, retryMessage, undoMessage, UNDO_MS, type OutItem, type Stored } from '@/lib/messages';

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

export const fromStored = (s: Stored): Comment => ({
  id: s.id, parentId: s.parentId, replyToId: s.replyToId, threadOwnerId: s.threadOwnerId, authorId: s.authorId, authorName: s.authorName,
  authorRole: s.authorRole, body: s.body, createdAt: s.createdAt ? new Date(s.createdAt) : null, postKey: s.postKey,
});

/** Only the author replies. A reader may answer the author's replies, in the thread they started. */
export function canReplyTo(opts: { canPost: boolean; isAuthor: boolean; me?: string }, c: Comment, thread: Comment) {
  return opts.canPost && (opts.isAuthor || (opts.me === thread.threadOwnerId && c.authorRole === 'admin' && c.id !== thread.id));
}

/** Re-renders every second while something is counting down. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [active]);
  return now;
}

export function Composer({ postKey, parentId, replyToId, name, email, compact, onDone }: { postKey: string; parentId?: string; replyToId?: string | null; name: string; email: string; compact?: boolean; onDone: (msg: string) => void }) {
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const id = `cm-${replyToId ?? parentId ?? 'new'}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setErr('Write something first.');
    setErr('');
    // It shows in the thread straight away and is sent after a short undo window (the queue survives closing the tab).
    queueMessage({ postKey, parentId: parentId ?? null, replyToId: replyToId ?? null, body });
    setBody('');
    onDone(`Sending in ${UNDO_MS / 1000} seconds. You can undo until then.`);
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
          <button className="btn accent" type="submit">{parentId ? 'Send reply' : 'Send'}</button>
        </div>
        {err && <span className="err" role="alert">{err}</span>}
      </div>
    </form>
  );
}

/** A message that has not reached the server yet: counting down to send, sending, or refused. */
export function PendingItem({ m, name }: { m: OutItem; name: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const now = useNow(m.status !== 'failed');
  const left = Math.max(0, Math.ceil((m.sendAt - now) / 1000));
  const counting = m.status === 'queued' && left > 0 && !m.waiting;
  return (
    <div className="cmt pend">
      <span className="av tone-sky" aria-hidden="true">{initialOf(name)}</span>
      <div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{name}</strong>
          {m.status === 'failed' ? <span className="badge tone-rose">Not sent</span> : <span className="badge">{counting ? `Sending in ${left} s` : m.waiting ? 'Waiting a moment' : 'Sending…'}</span>}
        </div>
        {editing ? (
          <form className="stack" style={{ gap: 10, marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); if (text.trim()) editQueued(m.clientId, text); setEditing(false); }}>
            <label className="sr" htmlFor={`pe-${m.clientId}`}>Edit message</label>
            <textarea className="inp" id={`pe-${m.clientId}`} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row" style={{ gap: 8 }}><button className="btn sm accent" type="submit">Send again</button><button className="btn sm ghost" type="button" onClick={() => { setEditing(false); setText(m.body); }}>Cancel</button></div>
          </form>
        ) : <p className="cm-body">{m.body}</p>}
        {m.status === 'failed' && !editing && <p className="err" role="alert" style={{ marginTop: 6 }}>{m.error}</p>}
        {!editing && (
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            {counting && <button className="btn sm" type="button" onClick={() => { undoMessage(m.clientId); }}>Undo</button>}
            {m.status === 'failed' && <button className="btn sm" type="button" onClick={() => setEditing(true)}>Edit and send again</button>}
            {m.status === 'failed' && <button className="btn sm ghost" type="button" onClick={() => retryMessage(m.clientId)}>Try again</button>}
            {m.status === 'failed' && <button className="btn sm ghost" type="button" onClick={() => discardMessage(m.clientId)}>Discard</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Item({ c, me, isAuthor, canReply, onReply, setNote }: {
  c: Comment; me?: string; isAuthor: boolean; canReply: boolean; onReply: () => void; setNote: (t: string) => void;
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
    const ok = await editMessage(c.id, t);
    setNote(ok ? 'Saved.' : 'Could not save your edit.');
    if (ok) setEditing(false);
    setBusy(false);
  }
  async function remove() {
    if (!confirm('Delete this message?')) return;
    if (!(await deleteMessage(c.id))) setNote('Could not delete the message.');
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
