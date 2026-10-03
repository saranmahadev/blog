import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useRole } from '@/lib/auth';
import { firebaseConfigured, getDb } from '@/lib/firebase';
import { Composer, Item, canReplyTo as canReplyRule, type Comment } from './parts';

export default function Comments({ postKey }: { postKey: string }) {
  const { status, user } = useAuth();
  const role = useRole(user);
  const isAuthor = role === 'admin';
  const seq = useRef(0);
  const [items, setItems] = useState<Comment[] | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || role === null) return; // wait until we know whether this is the author
    const mine = ++seq.current;
    try {
      const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
      const col = m.collection(db, 'comments');
      // The author sees every thread on the post; a reader sees only their own.
      const q = isAuthor
        ? m.query(col, m.where('postKey', '==', postKey), m.orderBy('createdAt', 'desc'))
        : m.query(col, m.where('postKey', '==', postKey), m.where('threadOwnerId', '==', user.uid), m.orderBy('createdAt', 'desc'));
      const snap = await m.getDocs(q);
      if (mine !== seq.current) return; // a newer load started; ignore this answer
      setItems(snap.docs.map((d) => {
        const x = d.data();
        return { id: d.id, parentId: x.parentId ?? null, replyToId: x.replyToId ?? null, threadOwnerId: x.threadOwnerId, authorId: x.authorId, authorName: x.authorName, authorRole: x.authorRole ?? 'user', body: x.body, createdAt: x.createdAt?.toDate?.() ?? null };
      }));
    } catch { if (mine === seq.current) setItems([]); }
  }, [postKey, user, role, isAuthor]);

  useEffect(() => { if (status === 'out') setItems([]); else if (status === 'in') load(); }, [status, load]);

  if (!firebaseConfigured) return null;

  const top = (items ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (items ?? []).filter((c) => c.parentId === id).sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
  const canPost = status === 'in' && user?.emailVerified;
  const canReplyTo = (c: Comment, thread: Comment) => canReplyRule({ canPost: !!canPost, isAuthor, me: user?.uid }, c, thread);
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

