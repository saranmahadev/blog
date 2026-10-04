# Security

[README](../README.md) · [Writing](WRITING.md) · [Architecture](ARCHITECTURE.md) · [Deploy](DEPLOY.md) · [Security](SECURITY.md) · [Advertising](ADVERTISING.md)

What protects the site and its readers, and the one-time settings that cannot live in the repository.

## Security

What protects the site and its readers, and what to do about the rest. The reader-facing version is `/security/`; the reporting policy is `.github/SECURITY.md` and `/.well-known/security.txt` (regenerated at every build with a fresh expiry).

**In the repository (automatic)**

- *Browser:* a Content-Security-Policy on every page (Astro hashes each inline script and style; `connect-src` is limited to our own origin, Google APIs and our Cloud Functions; no framing, no plugins, forms only to ourselves), plus HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, a strict referrer policy, a locked-down permissions policy and `Cross-Origin-Opener-Policy`. `pnpm check:csp` and `pnpm check:signed-in` fail a build that violates its own policy. Hashes for build-time diagram styles are added by `scripts/csp-hashes.mjs`.
- *Data:* Firestore is default-deny. A reader can read and write only their own state document, with each field capped and typed (the theme is one of three values). Not even the author can read readers' bookmarks or progress. Messages can be created only by the `postComment` function (identity, spam and rate limits, one-time ids); a thread is visible only to its reader and the author. `syncBeacon` verifies the sign-in token, cleans everything it accepts, caps its input and only answers the site's own origin. Both functions have `maxInstances: 5`, which also caps what an abuser can cost.
- *Identity:* there are no roles or admin passwords. The author is whoever has a verified `mail@saranmahadev.in`; Firebase marks an address verified only after the mailbox owner opens the link, and changing the address resets that. Registration needs 10+ characters and rejects the most common passwords.
- *Content:* nothing user-written is ever rendered as HTML (messages are plain text in React; the only `dangerouslySetInnerHTML` is Pagefind's own escaped search excerpt of our content). Feeds are sanitised with an allow-list.
- *Supply chain:* `pnpm install --frozen-lockfile` everywhere; deploys use the Firebase CLI version pinned in the lockfile, not `latest`; workflow tokens are read-only except for the two jobs that publish; deploy credentials are short-lived (Workload Identity Federation, no stored keys). The `Security` workflow (weekly, by hand, and when dependencies change on `main`) runs `pnpm audit`, `npm audit` for the functions and CodeQL. Dependabot opens grouped weekly update PRs and never merges. Advisories that have no fix and cannot be reached (build-time tools handling only our own files) are listed with `pnpm.auditConfig.ignoreGhsas` in `package.json`; remove an entry once a fix exists.

**One-time settings that cannot live in the repository** (Google Cloud and GitHub settings; none needs a command line)

1. *Restrict the Firebase web API key* (Google Cloud console → APIs and Services → Credentials): application restriction "Websites" with `https://blog.saranmahadev.in/*` and `https://stride-11129.firebaseapp.com/*`; API restriction to Identity Toolkit, Token Service and Cloud Firestore. The key is public by design, so this stops other sites from using the project's quota.
2. *Budget alert* (Billing → Budgets): a small monthly budget with email alerts. It is the backstop for any abuse of a pay-as-you-go project.
3. *Authentication → Settings:* keep "Email enumeration protection" on, keep only Email/Password enabled, and make sure the authorised domains list is just `blog.saranmahadev.in` (and the firebaseapp.com default).
4. *Protect the author mailbox* (`mail@saranmahadev.in`): it is the key to the author identity, so give it two-step verification and a unique password.
5. *GitHub → Settings → Code security:* turn on secret scanning with push protection and Dependabot alerts; *Branches:* protect `main` (require a pull request; the `build`-label run is the check); *Actions → General:* allow only actions from GitHub and the verified creators already used, and set the default token to read-only.
6. *Optional, stronger:* Firebase App Check with reCAPTCHA v3 makes the Cloud Functions and Firestore refuse requests that did not come from the real site. It needs a reCAPTCHA key and a client change; worth adding if the site ever sees abuse.
