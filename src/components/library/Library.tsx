import { useMemo, useState } from 'react';
import { bookmark } from '@/lib/sync';
import { decKey } from '@/lib/sync-core';
import { useSync } from '@/lib/useSync';
import SyncStatus from '@/components/sync/SyncStatus';

export type PostInfo = { slug: string; title: string; url: string; description: string; series?: string; minutes: number };

/** The reader's library: bookmarks, what they are part way through, and what they have finished. */
export default function Library({ posts, showStatus = true }: { posts: PostInfo[]; showStatus?: boolean }) {
  const s = useSync();
  const [tab, setTab] = useState<'bookmarks' | 'progress' | 'done'>('bookmarks');
  const bySlug = useMemo(() => new Map(posts.map((p) => [p.slug, p])), [posts]);
  const known = (key: string) => bySlug.get(decKey(key)); // unknown slugs (posts that were removed) are ignored

  const bookmarks = Object.entries(s.local.b).map(([k, at]) => ({ post: known(k), at })).filter((x) => x.post).sort((a, b) => b.at - a.at);
  const progress = Object.entries(s.local.p).map(([k, pct]) => ({ post: known(k), pct })).filter((x) => x.post);
  const reading = progress.filter((x) => x.pct >= 5 && x.pct < 90).sort((a, b) => b.pct - a.pct);
  const finished = progress.filter((x) => x.pct >= 90);

  const list = (items: { post?: PostInfo; extra: string; remove?: boolean }[], empty: string) =>
    items.length === 0 ? <p className="serif muted" style={{ marginTop: 28 }}>{empty}</p> : (
      <ol className="lib-list">
        {items.map(({ post, extra, remove }) => post && (
          <li key={post.slug} className="slab hov lib-item">
            <div style={{ minWidth: 0 }}>
              <div className="mono muted">{post.series ?? 'Standalone'} · {post.minutes} min · {extra}</div>
              <h3 className="head" style={{ fontSize: 22, marginTop: 4 }}><a href={post.url}>{post.title}</a></h3>
              <p className="serif muted" style={{ fontSize: 16, marginTop: 4 }}>{post.description}</p>
            </div>
            {remove && <button className="btn sm ghost" type="button" onClick={() => bookmark(post.slug, false)} aria-label={`Remove bookmark: ${post.title}`}>Remove</button>}
          </li>
        ))}
      </ol>
    );

  const top = reading[0];
  return (
    <div>
      {top?.post && tab === 'bookmarks' && (
        <a className="slab tone-accent lib-resume" href={top.post.url}>
          <span className="mono">Continue reading</span>
          <span className="head" style={{ fontSize: 24 }}>{top.post.title}</span>
          <span className="mono">{top.pct}% read →</span>
        </a>
      )}
      <div className="seg" role="tablist" aria-label="Bookmarks and reading" style={{ marginTop: 24 }}>
        <button type="button" role="tab" aria-selected={tab === 'bookmarks'} className={tab === 'bookmarks' ? 'on' : ''} onClick={() => setTab('bookmarks')}>Bookmarks ({bookmarks.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'progress'} className={tab === 'progress' ? 'on' : ''} onClick={() => setTab('progress')}>Continue reading ({reading.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>Finished ({finished.length})</button>
      </div>
      {tab === 'progress' && list(reading.map((x) => ({ post: x.post, extra: `${x.pct}% read` })), 'Nothing in progress. Open a post and it will show up here.')}
      {tab === 'bookmarks' && list(bookmarks.map((x) => ({ post: x.post, extra: `saved ${new Date(x.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, remove: true })), 'No bookmarks yet. Use the bookmark button next to a post.')}
      {tab === 'done' && list(finished.map((x) => ({ post: x.post, extra: 'read' })), 'Nothing finished yet.')}
      {showStatus && <div style={{ marginTop: 28 }}><SyncStatus /></div>}
    </div>
  );
}
