// The inbox: every conversation a reader has with the author (or, for the author, every reader's conversation).
// Reads only what the Firestore rules allow: a reader's own threads, or everything for the author.
import type { User } from 'firebase/auth';
import { getDb } from './firebase';
import type { Comment } from '@/components/comments/parts';

export type Thread = { id: string; postKey: string; owner: string; ownerName: string; messages: Comment[]; last: Comment };

const toComment = (id: string, x: Record<string, any>): Comment => ({
  id, parentId: x.parentId ?? null, replyToId: x.replyToId ?? null, threadOwnerId: x.threadOwnerId, authorId: x.authorId,
  authorName: x.authorName, authorRole: x.authorRole ?? 'user', body: x.body, createdAt: x.createdAt?.toDate?.() ?? null, postKey: x.postKey,
});

export async function loadThreads(user: User, isAuthor: boolean, max = 300): Promise<Thread[]> {
  const [db, m] = await Promise.all([getDb(), import('firebase/firestore')]);
  const col = m.collection(db, 'comments');
  const q = isAuthor
    ? m.query(col, m.orderBy('createdAt', 'desc'), m.limit(max))
    : m.query(col, m.where('threadOwnerId', '==', user.uid), m.orderBy('createdAt', 'desc'), m.limit(max));
  const snap = await m.getDocs(q);
  const byThread = new Map<string, Comment[]>();
  for (const d of snap.docs) {
    const c = toComment(d.id, d.data());
    const key = c.parentId ?? c.id;
    byThread.set(key, [...(byThread.get(key) ?? []), c]);
  }
  const threads: Thread[] = [];
  for (const [id, list] of byThread) {
    const messages = list.sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
    const top = messages.find((c) => c.id === id) ?? messages[0];
    threads.push({ id, postKey: top.postKey ?? '', owner: top.threadOwnerId, ownerName: top.authorRole === 'admin' ? '' : top.authorName, messages, last: messages[messages.length - 1] });
  }
  // A thread's owner name comes from the reader's own message.
  for (const t of threads) t.ownerName = t.messages.find((c) => c.authorRole !== 'admin')?.authorName ?? 'Reader';
  return threads.sort((a, b) => (b.last.createdAt?.getTime() ?? Infinity) - (a.last.createdAt?.getTime() ?? Infinity));
}

/** Is this thread waiting on me: the latest message is from the other side and newer than my last visit? */
export const isNew = (t: Thread, isAuthor: boolean, seenAt: Date | null) =>
  (isAuthor ? t.last.authorRole !== 'admin' : t.last.authorRole === 'admin') && (!seenAt || (t.last.createdAt?.getTime() ?? Infinity) > seenAt.getTime());

