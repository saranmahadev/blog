// Private messages, local-first.
//
//  - Sending: a message appears at once, waits 10 s so it can be undone (and so a quick burst is sent together),
//    then is sent through the postComment function. It lives in a queue in the browser until the server confirms it,
//    so closing the tab, going offline or a dropped answer never loses it. Closing the tab sends it immediately
//    (see sync.ts), and each message carries a one-time id so a repeat can never create a duplicate.
//    A message the server refuses stays visible as "Not sent: reason" and can be edited and sent again.
//  - Reading: messages are cached in the browser. The reader's one state document says when the latest message
//    happened; the page asks the server only for what changed since its cache, and only if something did.
import type { User } from 'firebase/auth';
import { getSnapshot as syncSnap, getUid, refreshAuthToken, setLeaveSource, subscribe as syncSubscribe, type LeaveMessage } from './sync';

export const UNDO_MS = 10_000;
const WAIT_MS = 31_000; // the server asks for 30 s between a reader's messages
const FULL_EVERY_MS = 24 * 3600_000; // a full refresh picks up deletions and edits made elsewhere
const CAP = 500;

export type Stored = {
  id: string; postKey: string; parentId: string | null; replyToId: string | null; threadOwnerId: string; authorId: string;
  authorName: string; authorRole: string; body: string; createdAt: number; updatedAt: number;
};
export type OutItem = {
  clientId: string; postKey: string; parentId: string | null; replyToId: string | null; body: string; createdAt: number;
  sendAt: number; status: 'queued' | 'sending' | 'failed'; error?: string; tries: number; waiting?: boolean;
};
type Cache = { v: 1; items: Stored[]; wm: number; seenM: number; fullAt: number };
export type MsgSnapshot = { items: Stored[]; outbox: OutItem[]; ready: boolean; error: string };

const browser = typeof window !== 'undefined';
const kCache = (u: string) => `drafted:v1:${u}:msgs`;
const kOut = (u: string) => `drafted:v1:${u}:out`;
const emptyCache = (): Cache => ({ v: 1, items: [], wm: 0, seenM: 0, fullAt: 0 });

const memory = new Map<string, string>();
function read(k: string) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch {} return memory.get(k) ?? null; }
function write(k: string, v: string) { try { localStorage.setItem(k, v); memory.delete(k); } catch { memory.set(k, v); } }

let uid: string | null = null;
let user: User | null = null;
let isAuthor = false;
let cache: Cache = emptyCache();
let out: OutItem[] = [];
let snap: MsgSnapshot = { items: [], outbox: [], ready: false, error: '' };
const EMPTY = snap;
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getSnapshot = () => snap;
export const getServerSnapshot = () => EMPTY;
function publish(p: Partial<MsgSnapshot> = {}) { snap = { ...snap, items: cache.items, outbox: out, ...p }; listeners.forEach((l) => l()); }

function parseOut(raw: string | null): OutItem[] {
  try {
    const x = JSON.parse(raw ?? '[]');
    if (!Array.isArray(x)) return [];
    return x.filter((m) => m && typeof m.clientId === 'string' && typeof m.body === 'string' && typeof m.postKey === 'string')
      .map((m): OutItem => ({ clientId: m.clientId, postKey: m.postKey, parentId: m.parentId ?? null, replyToId: m.replyToId ?? null, body: m.body, createdAt: Number(m.createdAt) || Date.now(), sendAt: Number(m.sendAt) || 0, status: m.status === 'failed' ? 'failed' : 'queued', error: m.error, tries: Number(m.tries) || 0 }));
  } catch { return []; }
}
function parseCache(raw: string | null): Cache {
  try { const x = JSON.parse(raw ?? 'null'); if (x && x.v === 1 && Array.isArray(x.items)) return { v: 1, items: x.items, wm: Number(x.wm) || 0, seenM: Number(x.seenM) || 0, fullAt: Number(x.fullAt) || 0 }; } catch {}
  return emptyCache();
}
/** A queued message whose stored copy has arrived (the id is `<uid>_<clientId>`) is delivered: drop it from the queue. */
function reconcileOutbox() {
  if (!uid) return;
  const have = new Set(cache.items.map((i) => i.id));
  const rest = out.filter((o) => !have.has(`${uid}_${o.clientId}`));
  if (rest.length !== out.length) { out = rest; saveOut(); }
}
const saveCache = () => { if (uid) write(kCache(uid), JSON.stringify(cache)); reconcileOutbox(); }; { if (uid) write(kCache(uid), JSON.stringify(cache)); };
const saveOut = () => { if (uid) write(kOut(uid), JSON.stringify(out.map((m) => (m.status === 'sending' ? { ...m, status: 'queued' } : m)))); };

// ---- binding to the signed-in person ---------------------------------------------------------------
export function bindMessages(u: User | null, author: boolean) {
  const id = u?.uid ?? null;
  if (id === uid && author === isAuthor) return;
  const changedUser = id !== uid;
  const changedRole = !changedUser && author !== isAuthor;
  uid = id; user = u; isAuthor = author;
  // The author sees everyone's threads and a reader only their own: a cache filled as one is wrong for the other.
  if (changedRole) { cache = emptyCache(); saveCache(); publish(); }
  if (changedUser || changedRole) generation += 1; // a load already in flight was for the old identity
  if (changedUser) {
    cache = uid ? parseCache(read(kCache(uid))) : emptyCache();
    out = uid ? parseOut(read(kOut(uid))) : [];
    reconcileOutbox();
    publish({ ready: !uid, error: '' });
    setLeaveSource(uid ? leaveMessages : null);
  }
  if (uid) { scheduleSend(); void ensureFresh(); }
}
if (browser) {
  // Another tab changed the queue or cache: pick it up. Also re-check when the account document says there is news.
  window.addEventListener('storage', (e) => {
    if (!uid) return;
    if (e.key === kCache(uid)) { cache = parseCache(e.newValue); publish(); }
    if (e.key === kOut(uid)) { out = parseOut(e.newValue); publish(); }
  });
  syncSubscribe(() => { if (uid) void ensureFresh(); });
  window.addEventListener('online', () => { if (uid) scheduleSend(0); });
}

const leaveMessages = (): LeaveMessage[] => out.filter((m) => m.status !== 'failed').map(({ clientId, postKey, parentId, replyToId, body }) => ({ clientId, postKey, parentId, replyToId, body }));

// ---- sending -----------------------------------------------------------------------------------------
let sendTimer: ReturnType<typeof setTimeout> | undefined;
let sending = false;

function scheduleSend(delay?: number) {
  clearTimeout(sendTimer);
  const next = out.filter((m) => m.status === 'queued').sort((a, b) => a.sendAt - b.sendAt)[0];
  if (!next) return;
  sendTimer = setTimeout(() => void sendDue(), delay ?? Math.max(0, next.sendAt - Date.now()));
}

export function queueMessage(input: { postKey: string; parentId?: string | null; replyToId?: string | null; body: string }): string {
  const clientId = crypto.randomUUID().replace(/-/g, '');
  out = [...out, { clientId, postKey: input.postKey, parentId: input.parentId ?? null, replyToId: input.replyToId ?? null, body: input.body.trim(), createdAt: Date.now(), sendAt: Date.now() + UNDO_MS, status: 'queued', tries: 0 }];
  saveOut(); publish(); scheduleSend();
  void refreshAuthToken(true); // so the copy used if the tab closes inside the undo window carries the current verified-email claim
  return clientId;
}
/** Takes a message back during the undo window. Returns its text so the writer can edit it. */
export function undoMessage(clientId: string): string | null {
  const m = out.find((x) => x.clientId === clientId);
  if (!m || m.status === 'sending') return null;
  out = out.filter((x) => x.clientId !== clientId);
  saveOut(); publish(); scheduleSend();
  return m.body;
}
/** Changes the text of a message that is still waiting (for example one the server refused) and sends it again. */
export function editQueued(clientId: string, body: string) {
  out = out.map((m) => (m.clientId === clientId ? { ...m, body: body.trim(), status: 'queued', error: undefined, sendAt: Date.now(), waiting: false, tries: 0 } : m));
  saveOut(); publish(); scheduleSend(0);
}
export const discardMessage = (clientId: string) => { out = out.filter((x) => x.clientId !== clientId); saveOut(); publish(); };
export function retryMessage(clientId: string) {
  out = out.map((m) => (m.clientId === clientId ? { ...m, status: 'queued', error: undefined, sendAt: Date.now(), waiting: false } : m));
  saveOut(); publish(); scheduleSend(0);
}

async function sendDue() {
  if (sending || !uid || !user) return;
  const item = out.filter((m) => m.status === 'queued' && m.sendAt <= Date.now()).sort((a, b) => a.sendAt - b.sendAt)[0];
  if (!item) { scheduleSend(); return; }
  if (browser && navigator.onLine === false) return; // the 'online' event restarts this
  sending = true;
  out = out.map((m) => (m.clientId === item.clientId ? { ...m, status: 'sending' } : m));
  publish();
  const mine = uid;
  try {
    const call = async () => {
      const [{ getFunctionsClient }, m] = await Promise.all([import('./firebase'), import('firebase/functions')]);
      const fns = await getFunctionsClient();
      await m.httpsCallable(fns, 'postComment')({ postKey: item.postKey, body: item.body, parentId: item.parentId, replyToId: item.replyToId, clientId: item.clientId });
    };
    try { await call(); }
    catch (e1) {
      // The verified-email claim lives in the sign-in token: refresh it once and try again.
      if (String((e1 as { code?: string }).code).includes('failed-precondition') && String((e1 as Error).message).includes('Verify')) { await user.getIdToken(true); await call(); } else throw e1;
    }
    if (mine !== uid) return;
    out = out.filter((m) => m.clientId !== item.clientId);
    saveOut(); publish();
    await ensureFresh(true); // our own message comes back through the normal "what changed" path
  } catch (err) {
    const code = String((err as { code?: string }).code ?? '');
    const text = String((err as Error).message ?? '').replace(/^.*?: /, '').replace(/ \[\d+\]$/, '');
    let next: Partial<OutItem>;
    if (/resource-exhausted/.test(code) && /wait a moment/i.test(text)) next = { status: 'queued', sendAt: Date.now() + WAIT_MS, waiting: true };
    else if (/internal|unavailable|deadline|unknown|unauthenticated|cancelled/.test(code) || !text) next = { status: 'queued', sendAt: Date.now() + Math.min(5 * 60_000, 3_000 * 2 ** item.tries) * (0.5 + Math.random()), tries: item.tries + 1 };
    else next = { status: 'failed', error: text };
    out = out.map((m) => (m.clientId === item.clientId ? { ...m, ...next } : m));
    saveOut(); publish();
  } finally { sending = false; scheduleSend(); }
}

// ---- reading -------------------------------------------------------------------------------------------
const toStored = (id: string, x: Record<string, any>): Stored => {
  const ms = (t: any) => t?.toMillis?.() ?? 0;
  return { id, postKey: x.postKey, parentId: x.parentId ?? null, replyToId: x.replyToId ?? null, threadOwnerId: x.threadOwnerId, authorId: x.authorId, authorName: x.authorName, authorRole: x.authorRole ?? 'user', body: x.body, createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt) || ms(x.createdAt) };
};
let refreshing: Promise<void> | null = null;
let generation = 0;

/** Asks the server for messages only when the account document says something happened since the cache was filled. */
export function ensureFresh(force = false): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = refresh(force).finally(() => { refreshing = null; });
  return refreshing;
}
async function refresh(force: boolean, retried = false): Promise<void> {
  const gen = generation;
  const s = syncSnap();
  if (!uid || !user || !s.signedIn || !s.pulledAt || getUid() !== uid) return;
  const full = !cache.fullAt || Date.now() - cache.fullAt > FULL_EVERY_MS;
  const news = s.latestMessageAt > cache.seenM;
  if (!full && !news && !force) { if (!snap.ready) publish({ ready: true }); return; }
  const mine = uid;
  try {
    const [{ getDb }, m] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
    const db = await getDb();
    const col = m.collection(db, 'comments');
    const q = full
      ? (isAuthor ? m.query(col, m.orderBy('createdAt', 'desc'), m.limit(CAP)) : m.query(col, m.where('threadOwnerId', '==', mine), m.orderBy('createdAt', 'desc'), m.limit(300)))
      : (isAuthor
        ? m.query(col, m.where('updatedAt', '>', m.Timestamp.fromMillis(Math.max(0, cache.wm - 2_000))), m.orderBy('updatedAt', 'asc'), m.limit(300))
        : m.query(col, m.where('threadOwnerId', '==', mine), m.where('updatedAt', '>', m.Timestamp.fromMillis(Math.max(0, cache.wm - 2_000))), m.orderBy('updatedAt', 'asc'), m.limit(300)));
    const snapDocs = await m.getDocs(q);
    if (mine !== uid) return;
    if (gen !== generation) { refreshing = null; return ensureFresh(true); }
    const got = snapDocs.docs.map((d) => toStored(d.id, d.data()));
    const byId = new Map((full ? [] : cache.items).map((i) => [i.id, i]));
    for (const g of got) byId.set(g.id, g);
    const items = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-CAP);
    cache = { v: 1, items, wm: Math.max(full ? 0 : cache.wm, ...got.map((g) => g.updatedAt)), seenM: Math.max(cache.seenM, s.latestMessageAt), fullAt: full ? Date.now() : cache.fullAt };
    saveCache();
    publish({ ready: true, error: '' });
  } catch (err) {
    // Just verified, or just became the author: the saved sign-in token may still say otherwise. Refresh it once and retry.
    if (!retried && String((err as { code?: string }).code).includes('permission-denied')) {
      try { await user?.getIdToken(true); return await refresh(force, true); } catch { /* fall through to the message below */ }
    }
    publish({ ready: true, error: 'Could not load your messages. Showing what is saved on this device.' });
  }
}

// ---- editing and deleting your own messages (applied on screen first, then saved) -------------------------
export async function editMessage(id: string, body: string): Promise<boolean> {
  const before = cache.items;
  cache = { ...cache, items: cache.items.map((i) => (i.id === id ? { ...i, body, updatedAt: Date.now() } : i)) };
  saveCache(); publish();
  try {
    const [{ getDb }, m] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
    await m.updateDoc(m.doc(await getDb(), 'comments', id), { body, updatedAt: m.serverTimestamp() });
    return true;
  } catch { cache = { ...cache, items: before }; saveCache(); publish(); return false; }
}
export async function deleteMessage(id: string): Promise<boolean> {
  const before = cache.items;
  cache = { ...cache, items: cache.items.filter((i) => i.id !== id) };
  saveCache(); publish();
  try {
    const [{ getDb }, m] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
    await m.deleteDoc(m.doc(await getDb(), 'comments', id));
    return true;
  } catch { cache = { ...cache, items: before }; saveCache(); publish(); return false; }
}
