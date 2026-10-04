# Deploy and quality gates

[README](../README.md) · [Writing](WRITING.md) · [Architecture](ARCHITECTURE.md) · [Deploy](DEPLOY.md) · [Security](SECURITY.md) · [Advertising](ADVERTISING.md)

How a change reaches the live site, and the checks that must pass first.

## Deploy

CI (`.github/workflows/deploy.yml`) builds on demand and deploys from `main`. Deploys run once these are set in GitHub:

- Variables: `FIREBASE_PROJECT_ID`, `SITE_URL`
- Secrets: `WORKLOAD_IDENTITY_PROVIDER`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`

The workflow runs on commits to `main` (build + deploy), when the `build` label is added to a pull request (build and checks only), when `deploy-preview` is added (build plus a temporary preview URL that expires in 7 days), or by hand from the Actions tab. Ordinary PR commits do not run it; to re-check a PR, re-add the label. The Firebase project is set in `.firebaserc`.

### Quality gates

After the build, the `gates` job must pass before any deploy or preview:

- `pnpm check:links`: every internal link, image, script and `#anchor` in `dist/` resolves.
- `pnpm check:feeds`: every feed is well formed, has the fields readers need, links only to pages that exist, and carries no scripts or SVG.
- `pnpm check:csp`: key pages (search, hydrated islands, auth pages) load in a real browser with no Content-Security-Policy violation.
- `pnpm check:a11y`: axe-core (WCAG 2.1 A/AA) on key pages in light and dark, plus the open search dialog. Fails on serious or critical violations.
- `pnpm check:lighthouse`: Lighthouse (`lighthouserc.json`) on Home and two Imaxt-heavy posts. Floors: performance 90, accessibility 95, SEO 95.

Run them locally after `pnpm build` with `pnpm check:dist` (set `CHROME_PATH` if Chrome is not at a standard location).
