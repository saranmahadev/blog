// Checks your TypeSafe key and the moderation question against the live API (run in Cloud Shell):
//   cd functions && npm ci && npm run build && TYPESAFE_API_KEY=... node scripts/test-jev.mjs
import { askJev } from '../lib/moderation.js';

const key = process.env.TYPESAFE_API_KEY;
if (!key) { console.error('Set TYPESAFE_API_KEY first.'); process.exit(1); }
for (const text of ['Great write-up, does the checkpoint survive restarts?', 'Buy cheap pills now http://spam.example', 'hmm, not sure about this']) {
  try {
    const j = await askJev(text, key);
    console.log(j.verdict.padEnd(8), JSON.stringify(j.probabilities), `confidence ${j.confidence}`, '<-', text);
  } catch (e) { console.error('FAILED for:', text, '\n ', String(e)); process.exitCode = 1; }
}
