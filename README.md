# Drafted

The blog behind [blog.saranmahadev.in](https://blog.saranmahadev.in): a static Astro 7 site with
Keystatic as its local, Git-backed editor, deployed to Firebase Hosting.

## Development

```sh
npm install      # also switches on the git hooks (see "Publishing")
npm run dev
```

Open the site at `http://localhost:4321` and the editor at `http://localhost:4321/keystatic`.
Keystatic exists only in development, so the production output is fully static.

## Content

| What | Where |
| --- | --- |
| Posts | `src/content/posts/*.mdx` |
| Series | `src/content/series/*.mdx` (a post joins one with `series:`) |
| Legal pages (Privacy, Terms, ...) | `src/content/legal/*.mdx` |

Write them directly or in Keystatic; both use the same files. Required post frontmatter:

```yaml
title: A clear post title
description: A concise summary (70 to 160 characters reads best in search)
publishedAt: 2026-11-27
tags:
  - astro
draft: false
```

`draft: true` keeps a post out of the public site. Posts use standard Markdown only (no custom
components): a paragraph that is entirely bold becomes a large statement, a blockquote that opens
with a bold label becomes a note, and a `mermaid` code block becomes a diagram.

## Publishing

CI **builds and deploys**. Every other check runs **on your machine**, in two git hooks.

```
git commit   pre-commit    type check, build, link + SEO + agent-file audits, security gate
git push     pre-push      fresh build, then the security gate with the dependency audit
GitHub       deploy.yml    npm ci, build, security gate, Firebase deploy (about 2 minutes)
```

The hooks are switched on by `npm install` (it sets `core.hooksPath` to `.githooks`). Run the same
checks by hand any time:

```sh
npm run release:prepare   # type check + build + verify + security gate (about 15 seconds)
npm run gate              # just the security gate, with the dependency audit (after a build)
```

### The security gate

`scripts/security-gate.mjs` inspects the build and blocks a release, **including new content**, if
any of these fail:

1. `security.txt` is valid and not within 14 days of expiring.
2. `firebase.json` sends the security headers, and the CSP is strict (no `unsafe-eval`, no
   `unsafe-inline` or wildcards for scripts).
3. The CSP covers every inline script in the build.
4. The build contains no source maps, secrets or editor files, and loads nothing from other origins.
5. No private keys, tokens or `.env` files anywhere in the repository.
6. No high or critical vulnerabilities in production dependencies (moderate ones only warn).

It is the one check also kept in CI, so skipping the hooks with `--no-verify` cannot ship anything
unsafe. Everything else (type check, link and SEO audits) is local only.

### Things to know

- **`firebase.json` changes with the build.** The CSP script hashes in it are regenerated on every
  build, and the pre-commit hook adds the file to your commit. CI regenerates it anyway.
- **`security.txt` expiry.** It is only checked when you commit, push or deploy, so renew `Expires`
  in `public/.well-known/security.txt` (at most one year ahead) before it comes within 60 days; the
  gate warns from then on and blocks at 14 days.
- **Skipped hooks mean unchecked links and SEO.** CI only enforces the security gate, so a broken
  link or a thin meta description would deploy if you bypass the hooks.
- **CI minutes.** A deploy takes roughly 2 minutes (install, build, gate, deploy). Dependabot pull
  requests also trigger a preview deploy.

## Production setup

- **Site URL:** `https://blog.saranmahadev.in`, set in `astro.config.mjs` and in the workflow.
- **Firebase project and site:** project `stride-11129` (`.firebaserc`), hosting site `blog-saranmahadev`
  (pinned in `firebase.json`; the project also hosts other sites, and the security gate refuses to
  build for any other target). The deploy uses the repository secret
  `FIREBASE_DEPLOY_SERVICE_ACCOUNT`; keep that account limited to Firebase Hosting deploy.
- **Headers and CSP:** `firebase.json`. The script hashes in the CSP are regenerated on every build.
- **IndexNow:** after each live deploy, `scripts/indexnow.mjs` submits the sitemap URLs.
