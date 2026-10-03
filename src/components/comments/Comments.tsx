import { useState } from 'react';
import { useAuth, useRole } from '@/lib/auth';
import { firebaseConfigured } from '@/lib/firebase';
import { useMessages } from '@/lib/useMessages';
import { Composer, Item, PendingItem, canReplyTo as canReplyRule, fromStored, type Comment } from './parts';

/** The comments under one post: this reader's conversation with the author (or, for the author, every reader's). */
export default function Comments({ postKey }: { postKey: string }) {
  const { status, user } = useAuth();
  const role = useRole(user);
  const isAuthor = role === 'admin';
  const msgs = useMessages();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!firebaseConfigured) return null;

  const items: Comment[] = msgs.items.filter((m) => m.postKey === postKey).map(fromStored);
  const pending = msgs.outbox.filter((m) => m.postKey === postKey);
  const top = items.filter((c) => !c.parentId).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  const repliesOf = (id: string) => items.filter((c) => c.parentId === id).sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  const pendingIn = (id: string) => pending.filter((m) => m.parentId === id);
  const canPost = status === 'in' && !!user?.emailVerified;
  const canReplyTo = (c: Comment, thread: Comment) => canReplyRule({ canPost, isAuthor, me: user?.uid }, c, thread);
  const here = typeof location === 'undefined' ? '/' : location.pathname;
  const done = (text: string) => { setReplyTo(null); setNote(text); };
  const myName = user?.displayName ?? '';
  const empty = top.length === 0 && pending.length === 0;

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
      {canPost && !isAuthor && <Composer postKey={postKey} name={myName} email={user?.email ?? ''} onDone={done} />}

      <div role="status" aria-live="polite">{note && <p className="cm-note">{note}</p>}</div>
      {msgs.error && <p className="hint" role="status">{msgs.error}</p>}

      {status === 'in' && !msgs.ready && empty && <p className="serif muted" style={{ marginTop: 24 }}>Loading…</p>}
      {status === 'in' && msgs.ready && empty && <p className="serif muted" style={{ marginTop: 24 }}>{isAuthor ? 'No reader messages on this post yet.' : 'Nothing yet. Say something to the author.'}</p>}

      {pending.filter((m) => !m.parentId).map((m) => <PendingItem key={m.clientId} m={m} name={myName || 'You'} />)}
      {top.map((c) => (
        <div key={c.id}>
          <Item c={c} me={user?.uid} isAuthor={isAuthor} canReply={canReplyTo(c, c)} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} setNote={setNote} />
          {replyTo === c.id && canPost && <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={null} name={myName} email={user?.email ?? ''} compact onDone={done} /></div>}
          {repliesOf(c.id).map((r) => (
            <div key={r.id}>
              <div className="cm-reply"><Item c={r} me={user?.uid} isAuthor={isAuthor} canReply={canReplyTo(r, c)} onReply={() => setReplyTo(replyTo === r.id ? null : r.id)} setNote={setNote} /></div>
              {replyTo === r.id && canPost && <div className="cm-reply"><Composer postKey={postKey} parentId={c.id} replyToId={r.id} name={myName} email={user?.email ?? ''} compact onDone={done} /></div>}
            </div>
          ))}
          {pendingIn(c.id).map((m) => <div className="cm-reply" key={m.clientId}><PendingItem m={m} name={myName || 'You'} /></div>)}
        </div>
      ))}
    </section>
  );
}
