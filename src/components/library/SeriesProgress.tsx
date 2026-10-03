import { progressOf } from '@/lib/sync-core';
import { useSync } from '@/lib/useSync';

type Part = { slug: string; title: string; url: string };

/** "2 / 4" box for a series page: how many parts are read and where to go next. */
export default function SeriesProgress({ parts }: { parts: Part[] }) {
  const s = useSync();
  const done = parts.filter((p) => progressOf(s.local, p.slug) >= 90).length;
  // Where to go next: the part you are part way through (furthest first), otherwise the first one you have not read.
  const partWay = parts.filter((p) => { const x = progressOf(s.local, p.slug); return x >= 5 && x < 90; }).sort((a, b) => progressOf(s.local, b.slug) - progressOf(s.local, a.slug))[0];
  const next = partWay ?? parts.find((p) => progressOf(s.local, p.slug) < 90);
  const started = parts.some((p) => progressOf(s.local, p.slug) >= 5);
  return (
    <div className="slab sprog" aria-label="Your progress in this series">
      <div className="mono">Your progress</div>
      <div className="disp sprog-n">{done} / {parts.length}</div>
      <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={parts.length} aria-valuenow={done} aria-label="Parts read"><i style={{ width: `${(done / Math.max(1, parts.length)) * 100}%` }} /></div>
      {next
        ? <><a className="btn ink sm" style={{ marginTop: 14 }} href={next.url}>{started ? 'Continue reading' : 'Start reading'} <span aria-hidden="true">→</span></a><p className="serif" style={{ marginTop: 10, fontSize: 16 }}>{next.title}</p></>
        : <p className="mono" style={{ marginTop: 12 }}>You have read every part.</p>}
    </div>
  );
}
