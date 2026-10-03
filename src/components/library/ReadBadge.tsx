import { progressOf } from '@/lib/sync-core';
import { useSync } from '@/lib/useSync';

/** "Read" or a percentage next to a post in a list, once the reader has started it. */
export default function ReadBadge({ slug, className = '' }: { slug: string; className?: string }) {
  const p = progressOf(useSync().local, slug);
  if (p >= 90) return <span className={`badge tone-mint ${className}`}>Read</span>;
  if (p >= 5) return <span className={`badge plain ${className}`}>{p}%</span>;
  return null;
}
