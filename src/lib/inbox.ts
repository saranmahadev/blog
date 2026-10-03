// The inbox groups cached messages into conversations. Reads nothing from the server itself (see messages.ts).
import type { Comment } from '@/components/comments/parts';
import { fromStored } from '@/components/comments/parts';
import type { Stored } from './messages';

export type Thread = { id: string; postKey: string; owner: string; ownerName: string; messages: Comment[]; last: Comment };

export function groupThreads(items: Stored[]): Thread[] {
  const byThread = new Map<string, Comment[]>();
  for (const s of items) {
    const c = fromStored(s);
    const key = c.parentId ?? c.id;
    byThread.set(key, [...(byThread.get(key) ?? []), c]);
  }
  const threads: Thread[] = [];
  for (const [id, list] of byThread) {
    const messages = list.sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
    const top = messages.find((c) => c.id === id) ?? messages[0];
    threads.push({
      id, postKey: top.postKey ?? '', owner: top.threadOwnerId,
      ownerName: messages.find((c) => c.authorRole !== 'admin')?.authorName ?? 'Reader', messages, last: messages[messages.length - 1],
    });
  }
  return threads.sort((a, b) => (b.last.createdAt?.getTime() ?? Infinity) - (a.last.createdAt?.getTime() ?? Infinity));
}

/** Is this thread waiting on me: the latest message is from the other side and newer than my last visit? */
export const isNew = (t: Thread, isAuthor: boolean, seenAt: Date | null) =>
  (isAuthor ? t.last.authorRole !== 'admin' : t.last.authorRole === 'admin') && (!seenAt || (t.last.createdAt?.getTime() ?? Infinity) > seenAt.getTime());
