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
  it('lets a reader record when they last read their inbox, but only as the server time', async () => {
    await assertSucceeds(updateDoc(doc(as('rin'), 'users/rin'), { inboxSeenAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('rin'), 'users/rin'), { inboxSeenAt: new Date('2030-01-01') }));
    await assertFails(updateDoc(doc(as('tom'), 'users/rin'), { inboxSeenAt: serverTimestamp() }));
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
  const author = () => as('dev', { role: 'admin' });

  it('shows a thread only to its reader and the author', async () => {
    await assertSucceeds(getDoc(doc(as('rin'), 'comments/rin1')));
    await assertSucceeds(getDoc(doc(as('rin'), 'comments/dev1'))); // the author's reply in rin's thread
    await assertSucceeds(getDoc(doc(author(), 'comments/rin1')));
    await assertSucceeds(getDoc(doc(author(), 'comments/tom1')));
    await assertFails(getDoc(doc(as('tom'), 'comments/rin1')));
    await assertFails(getDoc(doc(anon(), 'comments/rin1')));
  });
  it('does not let moderators or other staff read other people\'s threads', async () => {
    await assertFails(getDoc(doc(as('maya', { role: 'moderator' }), 'comments/rin1')));
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
