import { useEffect, useState } from 'react';
import { progress } from '@/lib/sync';
import { progressOf } from '@/lib/sync-core';
import { useSync } from '@/lib/useSync';

/** Remembers how far down the article the reader has been (furthest point only) and offers to pick up where they left off. */
export default function ReadTracker({ slug }: { slug: string }) {
  const s = useSync();
  const saved = progressOf(s.local, slug);
  const [offer, setOffer] = useState<number | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>('.prose');
    if (!body) return;
    let ticking = false;
    let sent = -1;
    const measure = () => {
      ticking = false;
      const r = body.getBoundingClientRect();
      const read = ((window.innerHeight - r.top) / r.height) * 100; // how much of the article is above the bottom of the screen
      const pct = read >= 96 ? 100 : Math.max(0, Math.min(99, read));
      if (pct >= sent + 5 || pct === 100 && sent < 100) { sent = pct; progress(slug, pct); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  // Offer to jump back once, on arrival at the top of an article that was left part way.
  useEffect(() => {
    if (asked || !s.signedIn && saved === 0) return;
    if (saved >= 8 && saved < 92 && window.scrollY < 200) { setOffer(saved); setAsked(true); }
  }, [saved, asked, s.signedIn]);

  if (offer === null) return null;
  return (
    <div className="resume" role="region" aria-label="Resume reading">
      <span>You read {offer}% of this post.</span>
      <button type="button" className="btn sm ink" onClick={() => {
        const body = document.querySelector<HTMLElement>('.prose');
        if (body) window.scrollTo({ top: window.scrollY + body.getBoundingClientRect().top + (body.offsetHeight * offer) / 100 - window.innerHeight * 0.6, behavior: 'smooth' });
        setOffer(null);
      }}>Pick up where you left off</button>
      <button type="button" className="btn sm ghost" onClick={() => setOffer(null)} aria-label="Dismiss">✕</button>
    </div>
  );
}
