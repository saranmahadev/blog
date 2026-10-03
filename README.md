# Blog

**Drafted**, by Dev. A static-first technical blog: Astro + Markdown/MDX + React islands + Tailwind, deployed to Firebase Hosting.

The visual design lives in [`design/`](design/README.md) (static previews and the design system). The site implements it in `src/styles/` (tokens and components) and `src/components/`.

## Develop

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm check      # type-check
pnpm build      # outputs dist/
```

## Writing

| Kind | File | URL |
| --- | --- | --- |
| Standalone post | `src/content/posts/<slug>.md(x)` | `/<slug>/` |
| Series metadata | `src/content/series/<series>/index.md` | `/<series>/` |
| Series post | `src/content/series/<series>/<post>.md(x)` | `/<series>/<post>/` |

- Frontmatter is validated in `src/content.config.ts`. Set `draft: true` to hide a post from production builds.
- Series posts are ordered by `order`, then `date`.
- A top-level slug can be a post *or* a series, never both, and cannot be a reserved route (`about`, `tags`, `login`, `admin`, ... see `src/lib/content.ts`). Violations fail the build.
- Series frontmatter (`index.md`) can set `tone` (`mint`, `lilac`, `sky`, `rose`) and `pattern` (`dots`, `rings`, `grid`, `stripes`, `check`); otherwise a stable choice is derived from the slug.
- Posts can be featured (`featured: true`): the newest featured post is the Home lead story.
- Use `.mdx` and `import` a component from `src/components/interactive/` to embed React; add `client:visible`/`client:load` to hydrate it.

## Imaxt: typography as the visuals

Posts use no images. Imaxt blocks (Statement, Stat, PullQuote, Compare, Steps, Timeline, Bars, Sidenote, CodeWalk, Marquee) turn type and layout into figures. Write the post as `.mdx` and use them directly, with no imports. Every block and its source is on the hidden `/imaxt/` Lab page; the code is in `src/components/imaxt/` and `src/styles/imaxt.css`.

A post can set a typographic cover in its frontmatter (`kind`: `word`, `stat`, `quote` or `stack`); without one, a stacked cover is made from the title:

```yaml
cover:
  kind: stack
  text: "One API for every vector"
  sub: "Axon, part one"
```

Imaxt v2 adds Heatmap, CurvedText, Scrolly/Beat and TypeLab (an interactive font playground, a React island that loads only when scrolled into view).

### Diagrams

Write a Mermaid diagram in a `mermaid` fenced block in any `.md` or `.mdx` post. It is rendered to SVG at build time (no client JavaScript), skinned to the Imaxt look, and rendered once per theme so it is correct in light and dark. Every diagram needs `accTitle` and `accDescr` (the build fails without them); add `caption="..."` or `wide` after the language. Rendering uses headless Chrome: set `CHROME_PATH` if it is not at a standard location (CI uses `/usr/bin/google-chrome`).

Numbers in the sample posts are mock data, labelled as such.

## Changing the colours

All colours are tokens in `src/styles/tokens.css`. The accent is `--accent` (with `--on-accent` for text on it and `--accent-lt` for dark surfaces); the dark theme overrides them in the `[data-theme='dark']` block.

## Not built yet

Search, tag and archive pages, RSS, sign-in, bookmarks, likes and comments (see the implementation plan). The header and footer carry no dead links for them.

## Deploy

CI (`.github/workflows/deploy.yml`) builds on demand and deploys from `main`. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

The workflow runs on commits to `main` (build + deploy), when the `build` label is added to a pull request (build and checks only), when `deploy-preview` is added (build plus a temporary preview URL that expires in 7 days), or by hand from the Actions tab. Ordinary PR commits do not run it; to re-check a PR, re-add the label. The Firebase project is set in `.firebaserc`.

### Quality gates

After the build, the `gates` job must pass before any deploy or preview:

- `pnpm check:links`: every internal link, image, script and `#anchor` in `dist/` resolves.
- `pnpm check:a11y`: axe-core (WCAG 2.1 A/AA) on key pages in light and dark, plus the open search dialog. Fails on serious or critical violations.
- `pnpm check:lighthouse`: Lighthouse (`lighthouserc.json`) on Home and two Imaxt-heavy posts. Floors: performance 90, accessibility 95, SEO 95.

Run them locally after `pnpm build` with `pnpm check:dist` (set `CHROME_PATH` if Chrome is not at a standard location).

## Search, feeds and SEO

- Search is Pagefind, indexed from the built HTML (`pnpm build` runs it). It covers posts and series; add `data-pagefind-ignore` to keep something out of the index. The overlay opens with `/` and only works on a built site.
- `/rss.xml` (all posts) and `/<series>/rss.xml` (per series) carry titles and descriptions.
- `/sitemap.xml` is generated from content, with `lastmod` from post dates. `/imaxt/` is excluded.
- Share images: `pnpm build` renders each post's Imaxt cover to `/og/<slug>.png` (1200x630) with headless Chrome, then discards the card pages. They exist only in `dist/`; nothing is committed. Posts with an image cover use that image.
- Posts emit `Article` and `BreadcrumbList` JSON-LD.


## Backend (Firebase Auth, Firestore, Functions)

Phase 3 adds accounts. The site stays static; sign-in, profiles and later comments load as small client-side islands.

- `firestore.rules`: default deny. A reader can read and edit only their own profile (`displayName`, `bio`, `preferences`). `role`, `email` and `createdAt` are written only by the server. Roles are custom claims (`user`, `author`, `moderator`, `admin`).
- `functions/` (region `asia-south1`): `onUserCreated` sets the default role claim and creates `users/{uid}`; `onUserDeleted` removes it.
- `src/lib/firebase.ts`: lazy client for Auth and Firestore. Without the `PUBLIC_FIREBASE_*` variables (see `.env.example`) it is inert and the site works as before.
- Local work: `pnpm emulators` starts Auth, Firestore and Functions. Set `PUBLIC_USE_EMULATORS=true` to point the site at them. `pnpm test:rules` runs the rules tests against the Firestore emulator (needs Java).
- CI: the `backend` job runs the rules tests and compiles the functions; it must pass before preview or deploy.
- Deploying rules and functions is separate from hosting: `firebase deploy --only firestore:rules,functions --project <id>`. The CI service account currently has Hosting access only; granting it more is a deliberate step.
