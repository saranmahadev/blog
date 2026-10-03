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

## Changing the colours

All colours are tokens in `src/styles/tokens.css`. The accent is `--accent` (with `--on-accent` for text on it and `--accent-lt` for dark surfaces); the dark theme overrides them in the `[data-theme='dark']` block.

## Not built yet

Search, tag and archive pages, RSS, sign-in, bookmarks, likes and comments (see the implementation plan). The header and footer carry no dead links for them.

## Deploy

CI (`.github/workflows/deploy.yml`) builds on every push/PR. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

Pull requests get a Firebase preview channel; pushes to `main` deploy to production. The Firebase project is set in `.firebaserc`.
