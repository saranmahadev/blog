# Blog

Static-first technical blog: Astro + Markdown/MDX + React islands + Tailwind, deployed to Firebase Hosting.

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
- Use `.mdx` and `import` a component from `src/components/interactive/` to embed React; add `client:visible`/`client:load` to hydrate it.

## Deploy

CI (`.github/workflows/deploy.yml`) builds on every push/PR. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

Pull requests get a Firebase preview channel; pushes to `master` deploy to production. Replace the placeholder project IDs in `.firebaserc`, and `domain.com` in `astro.config.mjs` / `public/robots.txt`.
