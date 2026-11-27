import type { APIRoute } from 'astro';

// Search, answer and training crawlers are all welcome. The explicit groups document that intent,
// so nobody has to guess whether a given agent is allowed. Keep in step with /terms/.
const AGENTS = [
  // Answer / retrieval agents (fetch pages to answer a user's question)
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'Perplexity-User',
  'DuckAssistBot',
  // Search crawlers
  'Googlebot',
  'Bingbot',
  'PerplexityBot',
  'Applebot',
  // Training crawlers (permitted by the site owner)
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;
  const groups = AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\nDisallow: /pagefind/`).join('\n\n');

  const text = `# Drafted by Saran Mahadev. Everything public is meant to be found, read and cited.
# Markdown versions of every post: /posts/<slug>.md  ·  Agent index: /llms.txt  ·  Full text: /llms-full.txt

User-agent: *
Allow: /
Disallow: /pagefind/

# Content-Signal: https://contentsignals.org
Content-Signal: search=yes, ai-input=yes, ai-train=yes

${groups}

Sitemap: ${sitemap}
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
