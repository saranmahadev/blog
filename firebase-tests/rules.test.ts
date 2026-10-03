import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  it("blocks other people's edits, client creates and client deletes", async () => {
    await assertFails(updateDoc(doc(as('tom'), 'users/rin'), { displayName: 'Hax' }));
    await assertFails(setDoc(doc(as('tom'), 'users/tom'), profile));
    await assertFails(deleteDoc(doc(as('rin'), 'users/rin')));
  });
});

describe('everything else', () => {
  it('is denied by default', async () => {
    await assertFails(getDoc(doc(as('rin'), 'comments/c1')));
    await assertFails(setDoc(doc(as('rin'), 'comments/c1'), { body: 'hi' }));
  });
});
