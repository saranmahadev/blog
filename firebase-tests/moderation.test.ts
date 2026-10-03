import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { askJev, bodyHash, decide } from '../functions/src/moderation';

describe('decide', () => {
  it('publishes only when clearly fine', () => {
    expect(decide({ approve: 0.97, review: 0.02, reject: 0.01 })).toBe('approve');
    expect(decide({ approve: 0.6, review: 0.3, reject: 0.1 })).toBe('review');
  });
  it('hides only when clearly bad', () => {
    expect(decide({ approve: 0.02, review: 0.03, reject: 0.95 })).toBe('reject');
    expect(decide({ approve: 0.1, review: 0.2, reject: 0.7 })).toBe('review');
  });
  it('leaves unclear answers for the author', () => {
    expect(decide({})).toBe('review');
    expect(decide({ approve: 0.5, reject: 0.5 })).toBe('review');
  });
});

describe('bodyHash', () => {
  it('changes when the text changes', () => {
    expect(bodyHash('a')).toBe(bodyHash('a'));
    expect(bodyHash('a')).not.toBe(bodyHash('b'));
  });
});

describe('askJev', () => {
  let server: http.Server;
  let url = '';
  let lastBody: any;
  let lastAuth = '';
  let mode: 'ok' | 'http500' | 'garbage' = 'ok';
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        lastBody = JSON.parse(raw); lastAuth = String(req.headers.authorization);
        if (mode === 'http500') { res.writeHead(500).end(); return; }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(mode === 'garbage' ? { nope: true } : { model: 'jev-x', answers: { verdict: { type: 'choice', choice: 'approve', probabilities: { approve: 0.93, review: 0.05, reject: 0.02 }, confidence: 0.9 } } }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as any).port}/v1/systemone`;
  });
  afterAll(() => server.close());

  it('sends one typed choice question and reads the probabilities', async () => {
    mode = 'ok';
    const j = await askJev('Great post, thanks', 'key123', url);
    expect(j.verdict).toBe('approve');
    expect(j.confidence).toBe(0.9);
    expect(lastAuth).toBe('Bearer key123');
    expect(lastBody.model).toBe('jev-latest');
    expect(lastBody.state).toContain('Great post, thanks');
    expect(Object.keys(lastBody.questions.verdict.criteria)).toEqual(['approve', 'review', 'reject']);
  });
  it('throws on errors so the comment stays pending', async () => {
    mode = 'http500';
    await expect(askJev('x', 'k', url)).rejects.toThrow();
    mode = 'garbage';
    await expect(askJev('x', 'k', url)).rejects.toThrow();
  });
});
