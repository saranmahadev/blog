import { describe, expect, it } from 'vitest';
import { applyAction, buildPatch, CAPS, clearSent, emptyLocal, encKey, isDirty, mergeAnonymous, mergeServer, parseLocal } from './sync-core';

const bm = (l = emptyLocal(), slug: string, on = true, at = 1000) => applyAction(l, { t: 'bookmark', slug, on, at });

describe('local changes', () => {
  it('encodes series slugs and records what changed', () => {
    const l = bm(undefined, 'curious-to-coder/symptoms');
    expect(l.b['curious-to-coder~symptoms']).toBe(1000);
    expect(isDirty(l)).toBe(true);
    expect(buildPatch(l).b).toEqual({ 'curious-to-coder~symptoms': 1000 });
  });
  it('removing a bookmark becomes a delete in the patch', () => {
    const l = bm(bm(undefined, 'a'), 'a', false);
    expect(buildPatch(l).b).toEqual({ a: null });
  });
  it('progress only moves forward', () => {
    let l = applyAction(emptyLocal(), { t: 'progress', slug: 'a', pct: 60 });
    l = applyAction(l, { t: 'progress', slug: 'a', pct: 30 });
    expect(l.p.a).toBe(60);
    expect(applyAction(l, { t: 'progress', slug: 'a', pct: 140 }).p.a).toBe(100);
  });
  it('ignores bad keys and settings', () => {
    expect(bm(undefined, 'Bad Slug!').b).toEqual({});
    expect(applyAction(emptyLocal(), { t: 'setting', key: 'T', value: 'x' }).s).toEqual({});
  });
  it('keeps within the caps by dropping the oldest bookmarks', () => {
    let l = emptyLocal();
    for (let i = 0; i < CAPS.b + 5; i++) l = bm(l, `post-${i}`, true, i + 1);
    expect(Object.keys(l.b)).toHaveLength(CAPS.b);
    expect(l.b['post-0']).toBeUndefined();
    expect(l.b[`post-${CAPS.b + 4}`]).toBeDefined();
  });
});

describe('merging with the server', () => {
  it('takes the server list but keeps unsynced local adds and removes', () => {
    let local = bm(bm(undefined, 'local-add', true, 5), 'removed-here', false);
    const m = mergeServer(local, { b: { 'removed-here': 3, 'other-device': 4 } });
    expect(Object.keys(m.b).sort()).toEqual(['local-add', 'other-device']);
  });
  it('drops bookmarks that were removed on another device', () => {
    const synced = { ...bm(undefined, 'gone'), dirty: { b: {}, p: {}, s: {}, n: 0 } };
    expect(mergeServer(synced, { b: {} }).b).toEqual({});
  });
  it('progress takes the furthest read and flags this device if it is ahead', () => {
    const local = applyAction(emptyLocal(), { t: 'progress', slug: 'a', pct: 80 });
    const m = mergeServer({ ...local, dirty: { b: {}, p: {}, s: {}, n: 0 } }, { p: { a: 50, b: 90 } });
    expect(m.p).toEqual({ a: 80, b: 90 });
    expect(Object.keys(m.dirty.p)).toEqual(['a']);
  });
  it('local unsynced settings win, otherwise the server wins', () => {
    const l = applyAction(emptyLocal(), { t: 'setting', key: 't', value: 'dark' });
    expect(mergeServer(l, { s: { t: 'light' } }).s.t).toBe('dark');
    expect(mergeServer({ ...l, dirty: { b: {}, p: {}, s: {}, n: 0 } }, { s: { t: 'light' } }).s.t).toBe('light');
  });
});

describe('signing in with data saved while signed out', () => {
  it('keeps everything from both sides and marks the new parts for sync', () => {
    const anon = applyAction(bm(undefined, 'anon-post', true, 9), { t: 'progress', slug: 'anon-post', pct: 40 });
    const account = { ...bm(undefined, 'account-post', true, 7), dirty: { b: {}, p: {}, s: {}, n: 0 } };
    const m = mergeAnonymous(account, anon);
    expect(Object.keys(m.b).sort()).toEqual(['account-post', 'anon-post']);
    expect(m.p['anon-post']).toBe(40);
    expect(Object.keys(m.dirty.b)).toEqual(['anon-post']);
  });
  it("the account's own theme beats the signed-out one", () => {
    const anon = applyAction(emptyLocal(), { t: 'setting', key: 't', value: 'dark' });
    const account = { ...applyAction(emptyLocal(), { t: 'setting', key: 't', value: 'light' }), dirty: { b: {}, p: {}, s: {}, n: 0 } };
    expect(mergeAnonymous(account, anon).s.t).toBe('light');
  });
});

describe('after a write', () => {
  it('forgets only what was sent; changes made during the write stay dirty', () => {
    const sentState = bm(undefined, 'a');
    const later = bm(sentState, 'b');
    const after = clearSent(later, sentState);
    expect(Object.keys(after.dirty.b)).toEqual(['b']);
  });
  it('inbox read resets the unread count once', () => {
    const l = applyAction(emptyLocal(), { t: 'inboxRead', at: 50 });
    expect(buildPatch(l).n0).toBe(true);
    expect(buildPatch(clearSent(l, l)).n0).toBe(false);
  });
});

describe('reading saved data', () => {
  it('survives garbage and unknown versions', () => {
    expect(parseLocal('not json')).toEqual(emptyLocal());
    expect(parseLocal('{"v":2}')).toEqual(emptyLocal());
    expect(parseLocal(JSON.stringify({ v: 1, b: { 'ok': 1, 'BAD KEY': 2, x: 'no' } })).b).toEqual({ ok: 1 });
  });
  it('encodes keys round trip', () => { expect(encKey('a/b-c')).toBe('a~b-c'); });
});
