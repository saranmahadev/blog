// Comment moderation with TypeSafe's Jev decision model (https://api.typesafe.ai/v1/systemone).
// Jev answers a typed question about some text with probabilities; it does not follow instructions in the text,
// so a comment cannot talk its way past the check. Anything unexpected falls back to "review" (stay pending).
import { createHash } from 'node:crypto';

export type Verdict = 'approve' | 'review' | 'reject';
export type Judgement = { verdict: Verdict; probabilities: Record<string, number>; confidence: number };

export const APPROVE_AT = 0.85;
export const REJECT_AT = 0.9;

export const bodyHash = (body: string) => createHash('sha1').update(body).digest('hex').slice(0, 16);

/** Publish only when clearly fine, hide only when clearly bad, otherwise leave it for the author to look at. */
export function decide(probabilities: Record<string, number>): Verdict {
  if ((probabilities.approve ?? 0) >= APPROVE_AT) return 'approve';
  if ((probabilities.reject ?? 0) >= REJECT_AT) return 'reject';
  return 'review';
}

const QUESTION = {
  type: 'choice',
  instructions: 'Should this reader comment on a software engineering blog be published?',
  criteria: {
    approve: 'A constructive, on-topic comment, question or thanks. Polite disagreement and criticism of the ideas are fine.',
    review: 'Borderline, off-topic, heated, very short or unclear, or you cannot tell whether it is acceptable.',
    reject: 'Spam, advertising, scams, links to unrelated sites, harassment, hate, threats, sexual content, personal data, or gibberish.',
  },
};

export const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/systemone';

/** A key from OpenRouter ("sk-or-...") goes to OpenRouter's System One endpoint; a TypeSafe key goes direct. JEV_URL overrides both. */
export const endpointFor = (apiKey: string) => process.env.JEV_URL || (apiKey.startsWith('sk-or-') ? OPENROUTER_URL : TYPESAFE_URL);

export async function askJev(text: string, apiKey: string, url = endpointFor(apiKey)): Promise<Judgement> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: `Comment:\n${text}`, model: 'jev-latest', questions: { verdict: QUESTION } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Jev responded ${res.status}`);
    const json = (await res.json()) as { answers?: { verdict?: { probabilities?: Record<string, number>; confidence?: number } } };
    const a = json.answers?.verdict;
    if (!a?.probabilities || typeof a.probabilities !== 'object') throw new Error('Unexpected Jev response');
    return { verdict: decide(a.probabilities), probabilities: a.probabilities, confidence: a.confidence ?? 0 };
  } finally {
    clearTimeout(timer);
  }
}
