// Local-first state for readers: bookmarks, reading progress and settings.
//
// Every change is saved to the browser at once (localStorage is synchronous, so closing the tab cannot lose it).
// Syncing to the server is the part that waits:
//   1. batch: 10 s after the last change, never more than 60 s after the first unsynced one;
//   2. on closing or hiding the page: hand the data over with sendBeacon, falling back to a keepalive fetch;
//   3. if that fails too, the change stays queued and is sent on the next visit, or when the connection returns;
//   4. failures retry with backoff; one tab syncs at a time (Web Locks), and repeats are harmless (field-level writes).
// Where a browser lacks a feature there is a fallback: no localStorage -> memory plus immediate writes;
// no Web Locks -> every tab may write (idempotent); no sendBeacon -> keepalive fetch; neither -> next visit.
import { applyAction, buildPatch, clearSent, emptyLocal, isDirty, mergeAnonymous, mergeServer, parseLocal, type Action, type Local, type Patch } from './sync-core';

const DEBOUNCE_MS = 10_000;
const MAX_WAIT_MS = 60_000;
const REFRESH_MS = 5 * 60_000;
const TOKEN_MS = 20 * 60_000;

export type SyncStatus = 'local' | 'saved' | 'pending' | 'syncing' | 'offline' | 'error';
export type Snapshot = { local: Local; status: SyncStatus; signedIn: boolean; unread: number; latestMessageAt: number; persisted: boolean | null; storage: boolean };

const key = (uid: string | null) => `drafted:v1:${uid ?? 'anon'}`;
const browser = typeof window !== 'undefined';

// ---- storage with an in-memory fallback -------------------------------------------------------
const memory = new Map<string, string>();
let storageOk = true;
function read(k: string): string | null {
  try { const v = localStorage.getItem(k); if (v !== null) return v; } catch { storageOk = false; }
  return memory.get(k) ?? null;
}
function write(k: string, v: string) {
  try { localStorage.setItem(k, v); memory.delete(k); } catch { storageOk = false; memory.set(k, v); }
}
function remove(k: string) { try { localStorage.removeItem(k); } catch {} memory.delete(k); }

// ---- the store ---------------------------------------------------------------------------------
let uid: string | null = null;
let fbUser: { getIdToken: () => Promise<string> } | null = null;
let token = '';
let snap: Snapshot = { local: parseLocal(browser ? read(key(null)) : null), status: 'local', signedIn: false, unread: 0, latestMessageAt: 0, persisted: null, storage: true };
const listeners = new Set<() => void>();

const current = () => parseLocal(read(key(uid)));
function publish(patch: Partial<Snapshot> = {}) { snap = { ...snap, local: current(), storage: storageOk, ...patch }; listeners.forEach((l) => l()); }
function persist(l: Local) { write(key(uid), JSON.stringify(l)); }
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getSnapshot = () => snap;
/** What the server renders (and the first client render must match): nothing saved yet. */
const EMPTY: Snapshot = { local: emptyLocal(), status: 'local', signedIn: false, unread: 0, latestMessageAt: 0, persisted: null, storage: true };
export const getServerSnapshot = () => EMPTY;

// ---- theme -------------------------------------------------------------------------------------
export function applyTheme(value: string | undefined) {
  if (!browser || !value) return;
  const dark = value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { if (value === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', value); } catch {}
}

// ---- changes -----------------------------------------------------------------------------------
let asked = false;
export function act(a: Action) {
  const cur = current();
  const next = applyAction(cur, a);
  if (next === cur) return;
  persist(next);
  if (a.t === 'setting' && a.key === 't') applyTheme(a.value);
  if (!asked && browser) { asked = true; navigator.storage?.persist?.().then((ok) => publish({ persisted: ok })).catch(() => {}); }
  publish({ status: uid ? 'pending' : 'local', ...(a.t === 'inboxRead' ? { unread: 0 } : {}) });
  if (uid) schedule(storageOk ? DEBOUNCE_MS : 0); // without local storage nothing is safe on this device, so do not wait
}
export const bookmark = (slug: string, on: boolean) => act({ t: 'bookmark', slug, on, at: Date.now() });
export const progress = (slug: string, pct: number) => act({ t: 'progress', slug, pct });
export const setTheme = (value: 'light' | 'dark' | 'system') => act({ t: 'setting', key: 't', value });
export const markInboxRead = () => act({ t: 'inboxRead', at: Date.now() });

// ---- sync --------------------------------------------------------------------------------------
let debounce: ReturnType<typeof setTimeout> | undefined;
let maxTimer: ReturnType<typeof setTimeout> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let flushing = false;
let failures = 0;
let lastPull = 0;
let beaconRev = -1;

function schedule(delay = DEBOUNCE_MS) {
  if (!uid || !isDirty(current())) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => flush(), delay);
  maxTimer ??= setTimeout(() => { maxTimer = undefined; flush(); }, MAX_WAIT_MS);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const locks = browser ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks) return fn(); // fallback: no Web Locks, every tab may write (the writes are idempotent)
  return locks.request(`drafted-sync-${uid}`, { ifAvailable: true }, async (lock) => (lock ? fn() : null));
}

async function writePatch(id: string, patch: Patch) {
  const [{ getDb }, m] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
  const db = await getDb();
  const fields = (o: Record<string, number | string | null>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null ? m.deleteField() : v]));
  const data: Record<string, unknown> = {};
  if (Object.keys(patch.b).length) data.b = fields(patch.b);
  if (Object.keys(patch.p).length) data.p = fields(patch.p);
  if (Object.keys(patch.s).length) data.s = fields(patch.s);
  if (patch.n0) data.n = 0;
  await m.setDoc(m.doc(db, 'users', id), data, { merge: true });
}

export async function flush() {
  clearTimeout(debounce); clearTimeout(maxTimer); maxTimer = undefined;
  if (!uid || flushing) return;
  const sent = current();
  if (!isDirty(sent)) { publish({ status: 'saved' }); return; }
  if (browser && navigator.onLine === false) { publish({ status: 'offline' }); return; }
  flushing = true;
  publish({ status: 'syncing' });
  const id = uid;
  try {
    const ran = await withLock(() => writePatch(id, buildPatch(sent)));
    if (ran === null) { publish({ status: 'pending' }); schedule(5_000); return; } // another tab is syncing; check again soon
    if (id !== uid) return;
    const after = clearSent(current(), sent);
    persist(after);
    failures = 0;
    publish({ status: isDirty(after) ? 'pending' : 'saved' });
    if (isDirty(after)) schedule();
  } catch (e) {
    failures += 1;
    const denied = (e as { code?: string })?.code === 'permission-denied';
    publish({ status: denied ? 'error' : navigator.onLine === false ? 'offline' : 'error' });
    if (!denied) { // back off with jitter; a rules rejection will not fix itself, so stop until the next visit
      clearTimeout(retry);
      retry = setTimeout(() => flush(), Math.min(5 * 60_000, 2_000 * 2 ** Math.min(failures, 8)) * (0.5 + Math.random()));
    }
  } finally { flushing = false; }
}

/** Reads the account document once and merges it with what this device has. */
async function pull() {
  const id = uid;
  if (!id) return;
  try {
    const [{ getDb }, m] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
    const db = await getDb();
    const d = await m.getDoc(m.doc(db, 'users', id));
    if (id !== uid) return;
    const server = d.exists() ? d.data() : {};
    const merged = mergeServer(current(), server);
    persist(merged);
    lastPull = Date.now();
    applyTheme(merged.s.t);
    publish({ unread: merged.dirty.n > 0 ? 0 : Number(server.n) || 0, latestMessageAt: Number(server.m) || 0 });
  } catch { publish({ status: navigator.onLine === false ? 'offline' : 'error' }); }
}

export async function attach(user: { uid: string; getIdToken: () => Promise<string> } | null) {
  if ((user?.uid ?? null) === uid && (user ? !!fbUser : true) && snap.signedIn === !!user) return;
  uid = user?.uid ?? null;
  fbUser = user;
  let local = parseLocal(read(key(uid)));
  if (uid) {
    // Data saved while signed out joins the account (then leaves this device's signed-out slot, so it cannot leak to the next person).
    const anon = parseLocal(read(key(null)));
    if (Object.keys(anon.b).length + Object.keys(anon.p).length + Object.keys(anon.s).length > 0) { local = mergeAnonymous(local, anon); remove(key(null)); }
  }
  persist(local);
  publish({ signedIn: !!uid, status: uid ? (isDirty(local) ? 'pending' : 'saved') : 'local', unread: 0, latestMessageAt: 0 });
  if (!uid) { applyTheme(local.s.t); return; }
  await refreshToken();
  await pull();
  schedule(2_000);
}

export function detach() { return attach(null); }

async function refreshToken() { try { token = (await fbUser?.getIdToken()) ?? ''; } catch {} }

// ---- leaving the page --------------------------------------------------------------------------
async function url() { const { beaconUrl } = await import('./firebase'); return beaconUrl(); }
let beaconTo = '';
if (browser) url().then((u) => { beaconTo = u; }).catch(() => {});

/** Hand unsynced data over while the page is going away. Does not clear anything: the normal sync repeats it harmlessly. */
export function flushOnLeave() {
  if (!uid || !token || !beaconTo) return;
  const l = current();
  if (!isDirty(l) || l.rev === beaconRev) return;
  beaconRev = l.rev;
  const body = JSON.stringify({ token, state: buildPatch(l) });
  try { if (navigator.sendBeacon?.(beaconTo, new Blob([body], { type: 'text/plain' }))) return; } catch {}
  try { void fetch(beaconTo, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }); } catch {}
  // Last resort: it stays queued and goes out on the next visit.
}

if (browser) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnLeave();
    else if (uid) { refreshToken(); if (isDirty(current())) schedule(1_000); if (Date.now() - lastPull > REFRESH_MS) pull(); }
  });
  window.addEventListener('pagehide', flushOnLeave);
  window.addEventListener('online', () => { if (uid) flush(); });
  window.addEventListener('offline', () => { if (uid) publish({ status: 'offline' }); });
  window.addEventListener('storage', (e) => { if (e.key === key(uid)) publish(); }); // another tab changed it
  setInterval(() => { if (uid) refreshToken(); }, TOKEN_MS);
}
