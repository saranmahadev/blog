import { useEffect, useRef, useState } from 'react';
import { useAuth, useRole } from '@/lib/auth';
import { firebaseConfigured } from '@/lib/firebase';
import { groupThreads, isNew } from '@/lib/inbox';
import { getSnapshot, markInboxRead } from '@/lib/sync';
import { useMessages } from '@/lib/useMessages';
import { Composer, Item, PendingItem, canReplyTo } from '@/components/comments/parts';

type PostInfo = { key: string; title: string; url: string };

export default function Inbox({ posts }: { posts: PostInfo[] }) {
  const { status, user } = useAuth();
  const role = useRole(user);
  const isAuthor = role === 'admin';
  const msgs = useMessages();
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'new' | 'all'>('new');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const marked = useRef(false);
  const byKey = new Map(posts.map((p) => [p.key, p]));
  const threads = groupThreads(msgs.items);

  useEffect(() => {
    if (status === 'out' && firebaseConfigured) location.replace(`/login/?next=${encodeURIComponent('/inbox/')}`);
  }, [status]);

  // On first sight of the messages: remember which conversations were new when you arrived, then count them as read.
  useEffect(() => {
    if (marked.current || !user || role === null || !msgs.ready) return;
    marked.current = true;
    const seen = getSnapshot().local.seenAt; // this device's last visit
    setFreshIds(new Set(threads.filter((x) => isNew(x, isAuthor, seen ? new Date(seen) : null)).map((x) => x.id)));
    markInboxRead(); // the unread count goes back to zero (saved with the rest, a few seconds later)
  });

  if (!firebaseConfigured) return <p className="serif muted">Accounts are not set up yet.</p>;
  if (status !== 'in' || !user || !msgs.ready) return <p className="serif muted" role="status">Loading your inbox…</p>;

  const fresh = threads.filter((t) => freshIds.has(t.id));
  const shown = tab === 'new' ? fresh : threads;
  const canPost = !!user.emailVerified;
  const myName = user.displayName ?? '';
  const done = (m: string) => { setReplyTo(null); setNote(m); };

  return (
    <div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
        <div className="seg" role="tablist" aria-label="Inbox view">
          <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>{isAuthor ? 'Needs a reply' : 'New replies'} {fresh.length > 0 && <span className="badge tone-accent">{fresh.length}</span>}</button>
          <button type="button" role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All conversations ({threads.length})</button>
        </div>
      </div>
      <div role="status" aria-live="polite">{note && <p className="cm-note">{note}</p>}</div>
      {msgs.error && <p className="hint" role="status">{msgs.error}</p>}

      {shown.length === 0 && (
        <p className="serif muted" style={{ marginTop: 28 }}>
          {tab === 'new' ? (isAuthor ? 'Nothing is waiting for your reply.' : 'No new replies from the author.') : (isAuthor ? 'No reader has written yet.' : 'You have not written to the author yet. Open any post and use the Comments section.')}
        </p>
      )}

      {shown.map((t) => {
        const post = byKey.get(t.postKey);
        const top = t.messages.find((c) => c.id === t.id) ?? t.messages[0];
        // Still waiting on me: it was new on arrival and the other side still has the last word.
        const unread = freshIds.has(t.id) && (isAuthor ? t.last.authorRole !== 'admin' : t.last.authorRole === 'admin');
        const waiting = msgs.outbox.filter((m) => m.parentId === t.id);
        return (
          <section key={t.id} className={`slab inb${unread ? ' inb-new' : ''}`} aria-label={`Conversation about ${post?.title ?? t.postKey}`}>
            <div className="row inb-head">
              <a className="head" style={{ fontSize: 20 }} href={post ? `${post.url}#comments` : '#'}>{post?.title ?? t.postKey}</a>
              {unread && <span className="badge tone-accent">New</span>}
              <span className="sp" />
              {isAuthor && <span className="meta">with {t.ownerName}</span>}
            </div>
            {t.messages.map((c) => (
              <div key={c.id}>
                <div className={c.id === t.id ? '' : 'cm-reply'}>
                  <Item c={c} me={user.uid} isAuthor={isAuthor} canReply={canReplyTo({ canPost, isAuthor, me: user.uid }, c, top)} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} setNote={setNote} />
                </div>
                {replyTo === c.id && canPost && (
                  <div className="cm-reply">
                    <Composer postKey={t.postKey} parentId={t.id} replyToId={c.id === t.id ? null : c.id} name={myName} email={user.email ?? ''} compact onDone={done} />
                  </div>
                )}
              </div>
            ))}
            {waiting.map((m) => <div className="cm-reply" key={m.clientId}><PendingItem m={m} name={myName || 'You'} /></div>)}
          </section>
        );
      })}
    </div>
  );
}
