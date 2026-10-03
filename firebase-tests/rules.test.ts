import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const AUTHOR = { email: 'mail@saranmahadev.in', email_verified: true };
const state = { b: { 'axon~intro': 1700000000000 }, p: { 'axon~intro': 40 }, s: { t: 'dark' }, n: 0 };

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'drafted-rules-test', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'users/rin'), { ...state, n: 3, m: 5 }); });
});

const as = (uid: string, claims: Record<string, unknown> = {}) => env.authenticatedContext(uid, claims).firestore();

describe('users (one small state document per reader)', () => {
  const doc_ = (uid: string, extra = {}) => doc(as(uid, extra), `users/${uid}`);
  it('lets a reader read only their own document; not even the author can read it', async () => {
    await assertSucceeds(getDoc(doc(as('rin'), 'users/rin')));
    await assertFails(getDoc(doc(as('tom'), 'users/rin')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/rin')));
    await assertFails(getDoc(doc(as('dev', AUTHOR), 'users/rin'))); // bookmarks and progress are private to the reader
    await assertSucceeds(getDoc(doc(as('dev', AUTHOR), 'users/dev')));
    await assertFails(getDoc(doc(as('maya', { email: 'maya@example.com', email_verified: true }), 'users/rin')));
    await assertFails(getDoc(doc(as('imposter', { email: 'mail@saranmahadev.in', email_verified: false }), 'users/rin'))); // the address must be verified
    await assertFails(getDoc(doc(as('imposter2', { email: 'Mail@saranmahadev.in.evil.com', email_verified: true }), 'users/rin')));
  });
  it('lets a reader change bookmarks, progress and settings, field by field', async () => {
    await assertSucceeds(updateDoc(doc(as('rin'), 'users/rin'), { 'b.newpost': 1, 'p.intro': 80, 's.t': 'light' }));
    await assertSucceeds(setDoc(doc(as('rin'), 'users/rin'), { b: { 'series~post': 7 } }, { merge: true })); // how the app writes it
    await assertSucceeds(setDoc(doc(as('rin'), 'users/rin'), { b: { other: 2 } }, { merge: true }));
  });
  it('lets a reader create their own document, but only with state fields and no unread count above zero', async () => {
    await assertSucceeds(setDoc(doc_('tom'), { b: { a: 1 }, p: {}, s: {} }));
    await assertFails(setDoc(doc(as('tom'), 'users/someone-else'), { b: {} }));
    await assertFails(setDoc(doc_('tom-a'), { b: {}, role: 'admin' }));
    await assertFails(setDoc(doc_('tom-b'), { b: {}, n: 9 }));
    await assertFails(setDoc(doc_('tom-c'), { b: {}, m: 1 }));
    await assertSucceeds(setDoc(doc_('tom-d'), { b: {}, n: 0 }));
  });
  it('only lets the reader reset the unread count to zero, never raise it', async () => {
    await assertSucceeds(updateDoc(doc(as('rin'), 'users/rin'), { n: 0 }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { n: 9 }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { m: 99 }));
  });
  it('blocks other fields, other people and deletion', async () => {
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { role: 'admin' }));
    await assertFails(setDoc(doc(as('rin'), 'users/rin'), { s: { t: 'neon' } }, { merge: true })); // settings are a known value
    await assertFails(setDoc(doc(as('rin'), 'users/rin'), { s: { junk: 'x'.repeat(5000) } }, { merge: true })); // and a known key
    await assertFails(getDocs(collection(env.authenticatedContext('dev', AUTHOR).firestore(), 'users'))); // nobody lists readers
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { displayName: 'x' }));
    await assertFails(updateDoc(doc(as('tom'), 'users/rin'), { 'b.x': 1 }));
    await assertFails(deleteDoc(doc(as('rin'), 'users/rin')));
  });
  it('caps how many bookmarks and progress entries one document can hold, and what settings it accepts', async () => {
    const many = (n: number, v: unknown = 1) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, v]));
    await assertSucceeds(setDoc(doc_('cap1'), { b: many(200), p: many(500), s: { t: 'dark' } }));
    await assertFails(setDoc(doc_('cap2'), { b: many(201) }));
    await assertFails(setDoc(doc_('cap3'), { p: many(501) }));
    await assertFails(setDoc(doc_('cap4'), { s: many(2, 'x') })); // settings: only the theme
  });
  it('has no other collections: everything else is denied', async () => {
    await assertFails(getDoc(doc(as('rin'), 'config/author')));
    await assertFails(setDoc(doc(as('dev', AUTHOR), 'config/author'), { uid: 'dev' }));
  });
});

const comment = (over = {}) => ({ postKey: 'axon/the-ingestion-pipeline', parentId: null, replyToId: null, threadOwnerId: 'rin', authorId: 'rin', authorName: 'Rin', authorRole: 'user', body: 'Nice post', createdAt: new Date(), ...over });

describe('comments (private between a reader and the author)', () => {
  const POST = 'axon/the-ingestion-pipeline';
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'comments/rin1'), comment());
      await setDoc(doc(db, 'comments/dev1'), comment({ parentId: 'rin1', replyToId: 'rin1', authorId: 'dev', authorName: 'Dev', authorRole: 'admin', body: 'Thanks!' }));
      await setDoc(doc(db, 'comments/tom1'), comment({ threadOwnerId: 'tom', authorId: 'tom', authorName: 'Tom' }));
    });
  });
  const anon = () => env.unauthenticatedContext().firestore();
  const author = () => as('dev', AUTHOR);

  it('shows a thread only to its reader and the author', async () => {
    await assertSucceeds(getDoc(doc(as('rin'), 'comments/rin1')));
    await assertSucceeds(getDoc(doc(as('rin'), 'comments/dev1'))); // the author's reply in rin's thread
    await assertSucceeds(getDoc(doc(author(), 'comments/rin1')));
    await assertSucceeds(getDoc(doc(author(), 'comments/tom1')));
    await assertFails(getDoc(doc(as('tom'), 'comments/rin1')));
    await assertFails(getDoc(doc(anon(), 'comments/rin1')));
  });
  it('does not let moderators or other staff read other people\'s threads', async () => {
    await assertFails(getDoc(doc(as('maya', { email: 'maya@example.com', email_verified: true }), 'comments/rin1')));
  });
  it('allows only the queries the page runs', async () => {
    const col = (db: ReturnType<typeof anon>) => collection(db, 'comments');
    await assertSucceeds(getDocs(query(col(as('rin')), where('postKey', '==', POST), where('threadOwnerId', '==', 'rin'))));
    await assertSucceeds(getDocs(query(col(author()), where('postKey', '==', POST))));
    await assertFails(getDocs(query(col(as('rin')), where('postKey', '==', POST)))); // would include other readers' threads
    await assertFails(getDocs(query(col(anon()), where('postKey', '==', POST))));
  });
  it('cannot be created from a client', async () => {
    await assertFails(setDoc(doc(as('rin', { email_verified: true }), 'comments/new'), comment()));
    await assertFails(setDoc(doc(author(), 'comments/new'), comment({ authorId: 'dev', authorRole: 'admin' })));
  });
  it('lets a writer edit only their own message body', async () => {
    await assertFails(updateDoc(doc(as('tom'), 'comments/rin1'), { body: 'Hax', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(author(), 'comments/rin1'), { body: 'Rewritten by the author', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('rin'), 'comments/rin1'), { body: 'x'.repeat(2001), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('rin'), 'comments/rin1'), { threadOwnerId: 'tom', body: 'x', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('rin'), 'comments/rin1'), { body: 'Edited', updatedAt: serverTimestamp() }));
  });
  it('lets the writer or the author delete', async () => {
    await assertFails(getDoc(doc(as('tom'), 'comments/rin1')));
    await assertFails(deleteDoc(doc(as('tom'), 'comments/rin1')));
    await assertSucceeds(deleteDoc(doc(as('rin'), 'comments/rin1')));
    await assertSucceeds(deleteDoc(doc(author(), 'comments/tom1')));
  });
});

describe('everything else', () => {
  it('is denied by default', async () => {
    await assertFails(getDoc(doc(as('rin'), 'bookmarks/b1')));
    await assertFails(setDoc(doc(as('rin'), 'bookmarks/b1'), { postKey: 'x' }));
  });
});
