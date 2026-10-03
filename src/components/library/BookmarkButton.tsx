import { useState } from 'react';
import { bookmark } from '@/lib/sync';
import { isBookmarked } from '@/lib/sync-core';
import { useSync } from '@/lib/useSync';

/** Icon button in the article actions: saves the post to the reader's library (on this device, and on the account when signed in). */
export default function BookmarkButton({ slug }: { slug: string }) {
  const s = useSync();
  const on = isBookmarked(s.local, slug);
  const [note, setNote] = useState('');
  return (
    <>
      <button
        className="ib sm" type="button" data-tip={on ? 'Bookmarked' : 'Bookmark'} aria-pressed={on}
        aria-label={on ? 'Remove bookmark' : 'Bookmark this post'}
        onClick={() => { bookmark(slug, !on); setNote(on ? 'Bookmark removed.' : s.signedIn ? 'Bookmarked.' : 'Bookmarked on this device. Sign in to keep it on your account.'); }}
      >
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={on ? { fill: 'currentColor' } : undefined}><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
      </button>
      <span className="sr" role="status" aria-live="polite">{note}</span>
    </>
  );
}
