// The reader's private state, kept in the browser first and synced to one small Firestore document later.
// This file is pure (no browser or Firebase code) so the merge rules can be tested on their own.
//
//   b: bookmarks  { "<slug>": savedAtMs }          p: furthest read  { "<slug>": 0..100 }
//   s: settings   { t: "light" | "dark" | "system" }
//   n: unread messages (the server raises it, the reader can only reset it to 0)
//
// Slugs contain "/" for posts inside a series; field names use "~" instead ("axon~the-ingestion-pipeline").

export const CAPS = { b: 200, p: 500, s: 8 } as const;

export type Local = {
  v: 1;
  b: Record<string, number>;
  p: Record<string, number>;
  s: Record<string, string>;
  /** Fields changed since the last successful sync, each with the revision at which it changed. */
  dirty: { b: Record<string, number>; p: Record<string, number>; s: Record<string, number>; n: number };
  rev: number;
  /** Per device: when this browser last opened the inbox. Not synced. */
  seenAt: number;
};
export type Server = { b?: Record<string, number>; p?: Record<string, number>; s?: Record<string, string>; n?: number; m?: number };
/** What gets written: null deletes a bookmark. */
export type Patch = { b: Record<string, number | null>; p: Record<string, number>; s: Record<string, string>; n0: boolean };

export const emptyLocal = (): Local => ({ v: 1, b: {}, p: {}, s: {}, dirty: { b: {}, p: {}, s: {}, n: 0 }, rev: 0, seenAt: 0 });

export const encKey = (slug: string) => slug.replace(/\//g, '~');
export const decKey = (key: string) => key.replace(/~/g, '/');
const validKey = (key: string) => /^[a-z0-9~-]{1,120}$/.test(key);

/** Reads whatever was saved, tolerating missing or damaged data. */
export function parseLocal(raw: string | null): Local {
  const base = emptyLocal();
  if (!raw) return base;
  try {
    const x = JSON.parse(raw);
    if (!x || x.v !== 1) return base;
    const num = (o: unknown) => Object.fromEntries(Object.entries((o && typeof o === 'object' ? o : {}) as Record<string, unknown>).filter(([k, v]) => validKey(k) && typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;
    const str = (o: unknown) => Object.fromEntries(Object.entries((o && typeof o === 'object' ? o : {}) as Record<string, unknown>).filter(([k, v]) => /^[a-z]{1,8}$/.test(k) && typeof v === 'string' && v.length <= 32)) as Record<string, string>;
    return {
      v: 1, b: num(x.b), p: num(x.p), s: str(x.s),
      dirty: { b: num(x.dirty?.b), p: num(x.dirty?.p), s: num(x.dirty?.s), n: typeof x.dirty?.n === 'number' ? x.dirty.n : 0 },
      rev: typeof x.rev === 'number' ? x.rev : 0, seenAt: typeof x.seenAt === 'number' ? x.seenAt : 0,
    };
  } catch { return base; }
}

/** Keeps a map within its cap by dropping the least valuable entries (oldest bookmark, smallest progress). */
function clamp<T extends number | string>(m: Record<string, T>, cap: number, rank: (k: string, v: T) => number): Record<string, T> {
  const keys = Object.keys(m);
  if (keys.length <= cap) return m;
  const keep = keys.sort((a, c) => rank(c, m[c]) - rank(a, m[a])).slice(0, cap);
  return Object.fromEntries(keep.map((k) => [k, m[k]]));
}
function enforceCaps(l: Local): Local {
  return { ...l, b: clamp(l.b, CAPS.b, (_, v) => v), p: clamp(l.p, CAPS.p, (_, v) => v), s: clamp(l.s, CAPS.s, () => 0) };
}

/** Local changes always win for fields still waiting to sync; the server decides the rest. */
export function mergeServer(local: Local, server: Server): Local {
  const out: Local = { ...local, b: {}, p: {}, s: {}, dirty: { ...local.dirty, b: { ...local.dirty.b }, p: { ...local.dirty.p }, s: { ...local.dirty.s } } };
  const sb = server.b ?? {}, sp = server.p ?? {}, ss = server.s ?? {};
  // Bookmarks: the server's list, except where this device has an unsynced add or remove.
  for (const [k, v] of Object.entries(sb)) if (validKey(k) && typeof v === 'number' && !(k in local.dirty.b)) out.b[k] = v;
  for (const k of Object.keys(local.dirty.b)) if (k in local.b) out.b[k] = local.b[k];
  // Progress: the furthest read anywhere. If this device is ahead, it has something to sync.
  for (const k of new Set([...Object.keys(sp), ...Object.keys(local.p)])) {
    const a = typeof sp[k] === 'number' ? sp[k] : -1, c = local.p[k] ?? -1;
    if (!validKey(k)) continue;
    out.p[k] = Math.max(a, c);
    if (c > a && !(k in out.dirty.p)) out.dirty.p[k] = local.rev;
  }
  // Settings: the server's, except where this device has an unsynced change.
  for (const [k, v] of Object.entries(ss)) if (typeof v === 'string' && !(k in local.dirty.s)) out.s[k] = v;
  for (const k of Object.keys(local.dirty.s)) if (k in local.s) out.s[k] = local.s[k];
  return enforceCaps(out);
}

/** Signing in on a device with data saved while signed out: keep all of it (union), the account's own settings win. */
export function mergeAnonymous(account: Local, anon: Local): Local {
  const out: Local = { ...account, dirty: { ...account.dirty, b: { ...account.dirty.b }, p: { ...account.dirty.p }, s: { ...account.dirty.s } }, b: { ...account.b }, p: { ...account.p }, s: { ...account.s }, rev: account.rev + 1 };
  for (const [k, v] of Object.entries(anon.b)) if (!(k in out.b) || out.b[k] < v) { out.b[k] = v; out.dirty.b[k] = out.rev; }
  for (const [k, v] of Object.entries(anon.p)) if ((out.p[k] ?? -1) < v) { out.p[k] = v; out.dirty.p[k] = out.rev; }
  for (const [k, v] of Object.entries(anon.s)) if (!(k in out.s)) { out.s[k] = v; out.dirty.s[k] = out.rev; }
  return enforceCaps(out);
}

export const isDirty = (l: Local) => Object.keys(l.dirty.b).length + Object.keys(l.dirty.p).length + Object.keys(l.dirty.s).length > 0 || l.dirty.n > 0;

export function buildPatch(l: Local): Patch {
  const patch: Patch = { b: {}, p: {}, s: {}, n0: l.dirty.n > 0 };
  for (const k of Object.keys(l.dirty.b)) patch.b[k] = k in l.b ? l.b[k] : null;
  for (const k of Object.keys(l.dirty.p)) if (k in l.p) patch.p[k] = Math.max(0, Math.min(100, Math.round(l.p[k])));
  for (const k of Object.keys(l.dirty.s)) if (k in l.s) patch.s[k] = l.s[k];
  return patch;
}

/** After a successful write, forget only what that write contained (changes made meanwhile stay dirty). */
export function clearSent(l: Local, sent: Local): Local {
  const keep = (now: Record<string, number>, was: Record<string, number>) => Object.fromEntries(Object.entries(now).filter(([k, r]) => was[k] !== r));
  return { ...l, dirty: { b: keep(l.dirty.b, sent.dirty.b), p: keep(l.dirty.p, sent.dirty.p), s: keep(l.dirty.s, sent.dirty.s), n: l.dirty.n === sent.dirty.n ? 0 : l.dirty.n } };
}

export type Action =
  | { t: 'bookmark'; slug: string; on: boolean; at: number }
  | { t: 'progress'; slug: string; pct: number }
  | { t: 'setting'; key: string; value: string }
  | { t: 'inboxRead'; at: number };

export function applyAction(l: Local, a: Action): Local {
  const rev = l.rev + 1;
  const out: Local = { ...l, rev, b: { ...l.b }, p: { ...l.p }, s: { ...l.s }, dirty: { ...l.dirty, b: { ...l.dirty.b }, p: { ...l.dirty.p }, s: { ...l.dirty.s } } };
  if (a.t === 'bookmark') {
    const k = encKey(a.slug);
    if (!validKey(k)) return l;
    if (a.on) out.b[k] = a.at; else delete out.b[k];
    out.dirty.b[k] = rev;
  } else if (a.t === 'progress') {
    const k = encKey(a.slug);
    const pct = Math.max(0, Math.min(100, Math.round(a.pct)));
    if (!validKey(k) || pct <= (out.p[k] ?? -1)) return l; // only ever moves forward
    out.p[k] = pct;
    out.dirty.p[k] = rev;
  } else if (a.t === 'setting') {
    if (!/^[a-z]{1,8}$/.test(a.key) || a.value.length > 32 || out.s[a.key] === a.value) return l;
    out.s[a.key] = a.value;
    out.dirty.s[a.key] = rev;
  } else if (a.t === 'inboxRead') {
    out.seenAt = a.at;
    out.dirty.n = rev;
  }
  return enforceCaps(out);
}

export const progressOf = (l: Local, slug: string) => l.p[encKey(slug)] ?? 0;
export const isBookmarked = (l: Local, slug: string) => encKey(slug) in l.b;
