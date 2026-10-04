import { describe, expect, it } from 'vitest';
import { draftUrl, parseDraftsToken } from './drafts';

describe('drafts token', () => {
  it('is off when nothing is set', () => {
    expect(parseDraftsToken(undefined)).toBeUndefined();
    expect(parseDraftsToken('')).toBeUndefined();
    expect(parseDraftsToken('   ')).toBeUndefined();
  });
  it('accepts a long alphanumeric secret', () => {
    expect(parseDraftsToken('0123456789abcdef0123456789abcdef')).toBe('0123456789abcdef0123456789abcdef');
    expect(parseDraftsToken('  0123456789abcdef  ')).toBe('0123456789abcdef');
  });
  it('rejects a short or unsafe value rather than quietly serving a guessable or broken path', () => {
    expect(() => parseDraftsToken('short')).toThrow();
    expect(() => parseDraftsToken('0123456789abcdef/../x')).toThrow();
    expect(() => parseDraftsToken('0123456789abcde!')).toThrow();
  });
});

describe('draft urls', () => {
  it('puts a post under the secret folder', () => {
    expect(draftUrl('tok', 'curious-to-coder/a-post')).toBe('/d/tok/curious-to-coder/a-post/');
    expect(draftUrl('tok', 'standalone')).toBe('/d/tok/standalone/');
  });
});
