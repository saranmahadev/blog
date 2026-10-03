# Blog

**Drafted**, by Dev. A static-first technical blog: Astro + Markdown/MDX + React islands + Tailwind, deployed to Firebase Hosting.

The visual design lives in [`design/`](design/README.md) (static previews, screenshots and the design system). The site implements it in `src/styles/` (tokens and components) and `src/components/`.

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

CI (`.github/workflows/deploy.yml`) builds on every push/PR. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

The workflow runs only on commits to `main` (merging a pull request counts), and deploys to production. Pull requests and other branches do not run it. The Firebase project is set in `.firebaserc`.
