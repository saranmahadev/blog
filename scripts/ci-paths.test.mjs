import { describe, expect, it } from 'vitest';
import { classify } from './ci-paths.mjs';

const run = (...files) => classify(files);
const ran = (o) => Object.entries(o).filter(([, v]) => v === true).map(([k]) => k);

describe('CI skip rules', () => {
  it('runs nothing heavy for docs-only changes', () => {
    const o = run('README.md', 'docs/SECURITY.md', 'LICENSE');
    expect(o.docsOnly).toBe(true);
    expect([o.build, o.typecheck, o.unit, o.lighthouse, o.backend]).toEqual([false, false, false, false, false]);
  });
  it('an article edit rebuilds and checks only that page, with no type check, Lighthouse or backend', () => {
    const o = run('src/content/series/dev-universe/a-connected-ecosystem.mdx');
    expect(o.build && o.feeds && o.articleOnly && o.browser).toBe(true);
    expect(o.slugs).toBe('a-connected-ecosystem');
    expect([o.lighthouse, o.backend, o.ads, o.unit, o.rules, o.functions]).toEqual([false, false, false, false, false, false]);
  });
  it('a standalone post edit names its slug', () => {
    expect(run('src/content/posts/welcome-to-drafted.mdx').slugs).toBe('welcome-to-drafted');
  });
  it('a Cloud Functions change runs only the functions build', () => {
    const o = run('functions/src/index.ts');
    expect(o.functions && o.backend).toBe(true);
    expect([o.build, o.typecheck, o.lighthouse, o.rules, o.signedin]).toEqual([false, false, false, false, false]);
  });
  it('a rules change runs only the rules tests (and the signed-in screens that depend on them)', () => {
    const o = run('firestore.rules');
    expect(o.rules && o.backend).toBe(true);
    expect([o.build, o.typecheck, o.lighthouse, o.functions]).toEqual([false, false, false, false]);
  });
  it('a style change runs the site checks and the signed-in screens', () => {
    const o = run('src/styles/components.css');
    expect(o.build && o.code && o.lighthouse && o.signedin && o.backend).toBe(true);
    expect(o.articleOnly).toBe(false);
  });
  it('a sponsor-only change runs the ad checks, not Lighthouse', () => {
    const o = run('src/content/sponsors/dev-universe-map.json');
    expect(o.ads && o.build && o.browser).toBe(true);
    expect([o.lighthouse, o.backend, o.typecheck]).toEqual([false, false, false]);
  });
  it('dependencies or the workflow run everything', () => {
    for (const f of ['package.json', 'pnpm-lock.yaml', '.github/workflows/deploy.yml']) {
      const o = run(f);
      expect([o.build, o.typecheck, o.unit, o.lighthouse, o.backend, o.rules, o.functions, o.ads, o.feeds].every(Boolean)).toBe(true);
    }
  });
  it('a changed check script re-runs the checks', () => {
    expect(run('scripts/check-seo.mjs').typecheck).toBe(true);
  });
  it('an unknown change set runs everything', () => {
    const o = classify([], { full: true });
    expect(ran(o)).toEqual(expect.arrayContaining(['build', 'lighthouse', 'backend', 'feeds', 'ads']));
  });
  it('a mixed change takes the union', () => {
    const o = run('README.md', 'functions/src/index.ts');
    expect(o.docsOnly).toBe(false);
    expect(o.functions).toBe(true);
  });
});
