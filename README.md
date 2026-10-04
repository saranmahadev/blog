<div align="center">

<img src="public/favicon.svg" alt="Drafted" width="72" height="72" />

# Drafted, by Dev

**A static-first blog where type does the work of images.**<br/>
Notes on engineering, systems and AI, built with Astro, MDX and a few small React islands.

[**blog.saranmahadev.in**](https://blog.saranmahadev.in) · [Writing guide](ARTICLE_GUIDE.md) · [Docs](docs/) · [Security](docs/SECURITY.md)

[![Build and deploy](https://github.com/saranmahadev/blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/saranmahadev/blog/actions/workflows/deploy.yml)
[![Security](https://github.com/saranmahadev/blog/actions/workflows/security.yml/badge.svg)](https://github.com/saranmahadev/blog/actions/workflows/security.yml)
![Astro](https://img.shields.io/badge/Astro-7-ff5d01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%C2%B7%20Auth%20%C2%B7%20Firestore-ffca28?logo=firebase&logoColor=black)
![Lighthouse](https://img.shields.io/badge/Lighthouse-%E2%89%A590-0cce6b?logo=lighthouse&logoColor=white)

</div>

---

## What this is

Drafted is the writing and thinking layer of [Dev Universe](https://blog.saranmahadev.in/dev-universe/): a personal blog built to be fast, readable and private.

- **Pages are files.** Markdown and MDX are built once and served from a CDN. Only search, sign-in, bookmarks and messages run code in the browser.
- **Imaxt, not images.** Posts use no pictures. Typographic blocks (Statement, Compare, Steps, Timeline, Heatmap, CodeWalk and more) and build-time Mermaid diagrams carry every figure, in light and dark.
- **Local-first readers.** Bookmarks, reading progress and theme are saved in the browser first and synced later, with fallbacks that never lose a change.
- **Private conversations, not public comments.** A reader writes to the author; only the two of them can see the thread.
- **Feeds done properly.** RSS, Atom and JSON Feed with full text, for the whole site, every series and every topic.
- **Checked before every deploy.** Links, feeds, a Content-Security-Policy, accessibility in light and dark, performance budgets, sponsored banners and signed-in screens.

## At a glance

| | |
|---|---|
| **Framework** | Astro 7, MDX, React islands, Tailwind 4, TypeScript |
| **Hosting** | Firebase Hosting (CDN, security headers, redirects) |
| **Accounts and data** | Firebase Auth (email and password), Firestore (default-deny rules), Cloud Functions (Mumbai) |
| **Search** | Pagefind, built into static files; no search server |
| **Diagrams** | Mermaid, rendered at build time for both themes |
| **CI** | GitHub Actions: runs on `main`, on labelled pull requests, or by hand; never on every commit |
| **Deploy** | Workload Identity Federation: short-lived credentials, no stored keys |

## Quick start

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # type-check
pnpm build        # builds dist/ (pages, share images, feeds, search index)
pnpm check:dist   # links, privacy, SEO, feeds, sponsors, advertise, CSP, accessibility, keyboard, Lighthouse
pnpm test         # unit tests, including the CI skip rules
```

Node 22 and pnpm 10 are required. Chrome is used at build time to render diagrams and share images (set `CHROME_PATH` if it is not in a standard place). Copy `.env.example` to `.env` to connect your own Firebase project, or leave it empty and the site builds without accounts.

## Project map

```text
src/
  content/
    posts/              standalone posts          ->  /<slug>/
    series/<series>/    a series and its posts    ->  /<series>/, /<series>/<post>/
    sponsors/           banner definitions (data, not code)
  components/           imaxt/ blocks, auth/, comments/, library/, search/, sponsor/
  pages/                routes: home, series, topics, about, legal pages, advertise
  lib/                  content model, sync, messages, prices, mail builder
  styles/               tokens and components (all colours are tokens)
scripts/                build steps (OG images, feeds, CSP hashes) and CI checks
functions/              Cloud Functions: messages, page-close sync, account cleanup
firebase-tests/         Firestore rules tests
docs/                   architecture, writing, deploy, security, advertising
design/                 the design system and static previews
```

## Documentation

| Read this | For |
|---|---|
| [`ARTICLE_GUIDE.md`](ARTICLE_GUIDE.md) | The author's voice, post formats, every Imaxt block, every content rule, templates and a checklist |
| [`docs/WRITING.md`](docs/WRITING.md) | Files, front matter, series, covers, diagrams and colours |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Search, feeds and SEO, local-first sync, messages and the backend |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | CI, labels, previews, and the quality gates |
| [`docs/SECURITY.md`](docs/SECURITY.md) | What protects readers, and the one-time settings outside the repository |
| [`docs/ADVERTISING.md`](docs/ADVERTISING.md) | Banner sizes, tiers, prices and how to add a sponsor |
| [`design/README.md`](design/README.md) | The design system |

## Writing a post

1. Add `src/content/posts/<slug>.mdx` (or a post inside a series folder).
2. Fill in the front matter (title, a description of 200 characters or fewer, date, tags) and keep `draft: true` while you write.
3. Follow [`ARTICLE_GUIDE.md`](ARTICLE_GUIDE.md): teach something a stranger can use, and say each thing once.
4. Run `pnpm check && pnpm build`, then `pnpm check:dist`.
5. Open a pull request, add the `build` label to run the full checks, and merge to deploy.

## For AI agents and crawlers

The source of every article is public in this repository as Markdown and MDX. Please read the content here, not by crawling the website: see [`public/robots.txt`](public/robots.txt) and the generated `llms.txt` at [blog.saranmahadev.in/llms.txt](https://blog.saranmahadev.in/llms.txt), which lists every article with its source file. Start at [`src/content`](src/content).

## Security

Found a vulnerability? Please email **mail@saranmahadev.in** before sharing it publicly. See [`.github/SECURITY.md`](.github/SECURITY.md) and [`docs/SECURITY.md`](docs/SECURITY.md).

## Contributing and licence

This is a personal publication, so pull requests that change articles or design are not expected; fixes to the code are welcome as issues. All rights reserved: see [LICENSE](LICENSE). Short quotations with credit and a link are welcome, and code snippets in the articles may be used freely with no warranty (see the [terms](https://blog.saranmahadev.in/terms/)).
