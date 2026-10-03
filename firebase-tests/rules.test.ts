import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const profile = { displayName: 'Rin', email: 'rin@example.com', role: 'user', bio: '', preferences: {} };

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'drafted-rules-test', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'users/rin'), profile); });
});

const as = (uid: string, claims: Record<string, unknown> = {}) => env.authenticatedContext(uid, claims).firestore();

describe('users', () => {
  it('lets a reader read their own profile only', async () => {
    await assertSucceeds(getDoc(doc(as('rin'), 'users/rin')));
    await assertFails(getDoc(doc(as('tom'), 'users/rin')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/rin')));
  });
  it('lets staff read profiles', async () => {
    await assertSucceeds(getDoc(doc(as('maya', { role: 'moderator' }), 'users/rin')));
    await assertSucceeds(getDoc(doc(as('dev', { role: 'admin' }), 'users/rin')));
  });
  it('lets a reader edit displayName, bio and preferences', async () => {
    await assertSucceeds(updateDoc(doc(as('rin'), 'users/rin'), { displayName: 'Rin R', bio: 'Hi', preferences: { theme: 'dark' } }));
  });
  it('blocks role escalation and email changes', async () => {
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { role: 'admin' }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { email: 'x@example.com' }));
  });
  it('validates field shapes', async () => {
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { displayName: '' }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { displayName: 'x'.repeat(41) }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { bio: 'x'.repeat(281) }));
  });
  it("blocks other people's edits and client deletes", async () => {
    await assertFails(updateDoc(doc(as('rin2'), 'users/rin'), { displayName: 'Hax' }));
    await assertFails(deleteDoc(doc(as('rin'), 'users/rin')));
  });
  it('lets a reader create only their own plain profile', async () => {
    const mine = { displayName: 'Tom', email: 'tom@example.com', role: 'user', bio: '', preferences: {}, createdAt: serverTimestamp() };
    const tom = (extra = {}) => as('tom', { email: 'tom@example.com', ...extra });
    await assertSucceeds(setDoc(doc(tom(), 'users/tom'), mine));
    await assertFails(setDoc(doc(as('tom', { email: 'tom@example.com' }), 'users/rin2'), mine)); // someone else's id
    await assertFails(setDoc(doc(tom(), 'users/tom'), { ...mine, role: 'admin' }));
    await assertFails(setDoc(doc(tom(), 'users/tom'), { ...mine, email: 'other@example.com' }));
    await assertFails(setDoc(doc(tom(), 'users/tom'), { ...mine, extra: 1 }));
    await assertFails(setDoc(doc(tom(), 'users/tom'), { ...mine, createdAt: new Date('2020-01-01') }));
  });
});

const comment = (over = {}) => ({ postKey: 'axon/the-ingestion-pipeline', parentId: null, authorId: 'rin', authorName: 'Rin', body: 'Nice post', status: 'published', createdAt: new Date(), ...over });

describe('comments', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'comments/pub'), comment());
      await setDoc(doc(db, 'comments/pend'), comment({ status: 'pending' }));
      await setDoc(doc(db, 'comments/tom-pend'), comment({ authorId: 'tom', status: 'pending' }));
    });
  });
  const anon = () => env.unauthenticatedContext().firestore();

  it('shows published comments to anyone and pending ones only to their author and staff', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'comments/pub')));
    await assertFails(getDoc(doc(anon(), 'comments/pend')));
    await assertSucceeds(getDoc(doc(as('rin'), 'comments/pend')));
    await assertFails(getDoc(doc(as('tom'), 'comments/pend')));
    await assertSucceeds(getDoc(doc(as('maya', { role: 'moderator' }), 'comments/pend')));
  });
  it('allows the public and own-pending queries the page runs', async () => {
    const col = (db: ReturnType<typeof anon>) => collection(db, 'comments');
    await assertSucceeds(getDocs(query(col(anon()), where('postKey', '==', 'axon/the-ingestion-pipeline'), where('status', '==', 'published'))));
    await assertSucceeds(getDocs(query(col(as('rin')), where('postKey', '==', 'axon/the-ingestion-pipeline'), where('authorId', '==', 'rin'))));
    await assertFails(getDocs(query(col(anon()), where('postKey', '==', 'axon/the-ingestion-pipeline'))));
  });
  it('cannot be created from a client', async () => {
    await assertFails(setDoc(doc(as('rin', { email_verified: true }), 'comments/new'), comment({ status: 'pending' })));
  });
  it('lets the author edit the body, which sends it back to review', async () => {
    await assertFails(updateDoc(doc(as('rin'), 'comments/pub'), { body: 'Edited', updatedAt: serverTimestamp() })); // stays published
    await assertFails(updateDoc(doc(as('rin'), 'comments/pub'), { status: 'published', body: 'x', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('rin'), 'comments/pub'), { body: 'x'.repeat(2001), status: 'pending', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('tom'), 'comments/pub'), { body: 'Hax', status: 'pending', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('rin'), 'comments/pub'), { body: 'Edited', status: 'pending', updatedAt: serverTimestamp() }));
  });
  it('lets staff change status only', async () => {
    const mod = () => as('maya', { role: 'moderator' });
    await assertSucceeds(updateDoc(doc(mod(), 'comments/pend'), { status: 'published', moderatedBy: 'maya', moderatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(mod(), 'comments/pend'), { body: 'rewritten' }));
    await assertFails(updateDoc(doc(as('rin'), 'comments/pend'), { status: 'published' }));
  });
  it('lets the author or staff delete', async () => {
    await assertFails(deleteDoc(doc(as('tom'), 'comments/pub')));
    await assertSucceeds(deleteDoc(doc(as('rin'), 'comments/pub')));
    await assertSucceeds(deleteDoc(doc(as('dev', { role: 'admin' }), 'comments/pend')));
  });
});

describe('reports', () => {
  const report = (over = {}) => ({ commentId: 'pub', reporterId: 'tom', reason: 'spam', createdAt: serverTimestamp(), ...over });
  const tom = () => as('tom', { email_verified: true });
  it('lets a verified reader file one report per comment', async () => {
    await assertSucceeds(setDoc(doc(tom(), 'reports/pub_tom'), report()));
  });
  it('rejects unverified readers, wrong ids and impersonation', async () => {
    await assertFails(setDoc(doc(as('tom'), 'reports/pub_tom'), report()));
    await assertFails(setDoc(doc(tom(), 'reports/other_tom'), report()));
    await assertFails(setDoc(doc(tom(), 'reports/pub_tom'), report({ reporterId: 'rin' })));
    await assertFails(setDoc(doc(tom(), 'reports/pub_tom'), report({ reason: 'x'.repeat(201) })));
  });
  it('is readable only by staff and cannot be changed', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'reports/pub_tom'), { commentId: 'pub', reporterId: 'tom', reason: 'spam', createdAt: new Date() }); });
    await assertFails(getDoc(doc(tom(), 'reports/pub_tom')));
    await assertSucceeds(getDoc(doc(as('maya', { role: 'moderator' }), 'reports/pub_tom')));
    await assertFails(updateDoc(doc(tom(), 'reports/pub_tom'), { reason: 'changed' }));
    await assertFails(deleteDoc(doc(tom(), 'reports/pub_tom')));
  });
});

describe('everything else', () => {
  it('is denied by default', async () => {
    await assertFails(getDoc(doc(as('rin'), 'bookmarks/b1')));
    await assertFails(setDoc(doc(as('rin'), 'bookmarks/b1'), { postKey: 'x' }));
  });
});
