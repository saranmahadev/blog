import { useCallback, useEffect, useRef, useState } from 'react';

type Hit = { url: string; title: string; excerpt: string; kind: string; series?: string };
type Pagefind = {
  search: (q: string, o?: { filters?: Record<string, string> }) => Promise<{ results: { data: () => Promise<any> }[] }>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  debouncedSearch: (q: string, o?: { filters?: Record<string, string> }, ms?: number) => Promise<any>;
};

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'Series', label: 'Series' },
  { id: 'Post', label: 'Posts' },
];

export default function Search() {
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pf = useRef<Pagefind | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);

  const load = useCallback(async () => {
    if (pf.current || state === 'loading') return;
    setState('loading');
    try {
      const url = '/pagefind/pagefind.js'; // built by `pagefind --site dist`, so it is not bundled
      const mod = await import(/* @vite-ignore */ url);
      await mod.options?.({ excerptLength: 22 });
      pf.current = mod as unknown as Pagefind;
      const f = await pf.current.filters();
      setTopics(Object.entries(f.topic ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t));
      setState('ready');
    } catch {
      setState('unavailable');
    }
  }, [state]);

  const open = useCallback(() => {
    dlg.current?.showModal();
    input.current?.focus();
    load();
  }, [load]);
  const close = () => dlg.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !dlg.current?.open) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    let stale = false;
    const term = q.trim();
    if (!pf.current || term.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    (async () => {
      const filters: Record<string, string> = {};
      if (kind) filters.kind = kind;
      if (topic) filters.topic = topic;
      const res = await pf.current!.debouncedSearch(term, { filters }, 120);
      if (!res || stale) return;
      const data = await Promise.all(res.results.slice(0, 8).map((r: { data: () => Promise<any> }) => r.data()));
      if (stale) return;
      setHits(
        data.map((d) => ({
          url: d.url,
          title: d.meta?.title ?? d.url,
          excerpt: d.excerpt,
          kind: d.filters?.kind?.[0] ?? d.filters?.kind ?? 'Post',
          series: d.filters?.series?.[0] ?? d.filters?.series,
        })),
      );
      setActive(0);
      setSearched(true);
    })();
    return () => { stale = true; };
  }, [q, kind, topic, state]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && hits[active]) { window.location.href = hits[active].url; }
  };

  useEffect(() => {
    dlg.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <>
      <button className="srch" type="button" onClick={open} aria-label="Search" aria-keyshortcuts="/">
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span className="srch-t">Search</span>
        <span className="kbd srch-k" aria-hidden="true">/</span>
      </button>

      <dialog
        ref={dlg}
        className="sdlg"
        aria-label="Search"
        onClick={(e) => { if (e.target === dlg.current) close(); }}
        onClose={() => { setQ(''); setKind(''); setTopic(''); setHits([]); setSearched(false); }}
      >
        <div className="dlg sdlg-in">
          <div className="sdlg-top">
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 26, height: 26 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <label className="sr" htmlFor="site-search">Search posts and series</label>
            <input
              id="site-search" ref={input} className="sdlg-input" type="search" autoComplete="off" spellCheck={false}
              placeholder="Search posts and series" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
              role="combobox" aria-expanded={hits.length > 0} aria-controls="search-results" aria-activedescendant={hits[active] ? `sr-${active}` : undefined}
            />
            <button type="button" className="kbd sdlg-esc" onClick={close} aria-label="Close search">esc</button>
          </div>

          <div className="sdlg-filters" role="group" aria-label="Filter results">
            <span className="mono muted">Filter</span>
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`pill lg${kind === k.id ? ' on' : ''}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
            ))}
            {topics.map((t) => (
              <button key={t} type="button" className={`pill lg${topic === t ? ' on' : ''}`} aria-pressed={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>{t}</button>
            ))}
            <span className="sp" />
            <span className="meta" role="status" aria-live="polite">{searched ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : ''}</span>
          </div>

          <div className="sdlg-body">
            {state === 'unavailable' && <p className="sdlg-empty">Search is built on deploy. Run <code>pnpm build</code> and <code>pnpm preview</code> to try it locally.</p>}
            {state !== 'unavailable' && !searched && <p className="sdlg-empty">Type at least two letters.</p>}
            {searched && hits.length === 0 && <p className="sdlg-empty">Nothing found for “{q.trim()}”. Try a shorter word, or <a href="/topics/">browse topics</a>.</p>}
            {hits.length > 0 && (
              <ul id="search-results" role="listbox" aria-label="Results">
                {hits.map((h, i) => (
                  <li key={h.url} id={`sr-${i}`} role="option" aria-selected={i === active} className={`sres${i === active ? ' on' : ''}`}>
                    <a href={h.url} onMouseMove={() => setActive(i)}>
                      <span className="mono muted">{h.kind === 'Series' ? 'Series' : h.series ?? 'Post'}</span>
                      <span className="head sres-t">{h.title}</span>
                      <span className="serif sres-x" dangerouslySetInnerHTML={{ __html: h.excerpt }} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sdlg-foot mono muted" aria-hidden="true">
            <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
            <span><span className="kbd">↵</span> open</span>
            <span><span className="kbd">esc</span> close</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
