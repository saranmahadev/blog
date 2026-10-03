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


## Local-first state and sync

Posts are static, so the database holds no post data. A reader's own data is one small document, `users/{uid}`, keyed by post slug (`/` written as `~`):

| field | meaning |
|---|---|
| `b` | bookmarks: slug to time saved (max 200) |
| `p` | furthest read: slug to 0..100 (max 500) |
| `s` | settings, today `t` = light / dark / system |
| `n` | unread messages (the server raises it, the reader can only reset it) |
| `m` | time of the latest message for this reader |

It is read once at sign-in. Everything the reader does is saved to the browser first and synced later (`src/lib/sync.ts`, merge rules in `src/lib/sync-core.ts`, covered by `src/lib/sync-core.test.ts`):

1. **Save locally at once.** Bookmarks, progress, settings and unsent messages go to `localStorage` the moment they change, so closing the tab cannot lose them. The browser is asked to keep that storage (`navigator.storage.persist()`).
2. **Batch.** The server is written 10 s after the last change, and at most 60 s after the first unsynced one, as one field-level write (no read first, repeats are harmless). Nothing changed means no write.
3. **Closing the tab.** On `visibilitychange` / `pagehide` the unsynced data is handed over with `navigator.sendBeacon` to the `syncBeacon` function.
4. **Fallbacks, in order.** No `sendBeacon` or it refuses: a `keepalive` fetch. That fails too, or the browser was killed: the data stays queued and is sent on the next visit, or when the connection returns (`online` event). Failures retry with backoff. No `localStorage` (private mode, blocked): memory only, changes are sent immediately and the page says so. No Web Locks (older Safari): every tab may write, which is safe because the writes are idempotent.
5. **One tab syncs at a time** (Web Locks), and tabs stay in step through `storage` events.
6. **Merging devices.** Bookmarks: the server's list, except where this device has an unsynced add or remove. Progress: the furthest read wins. Settings: this device's unsynced change, otherwise the server's. Data saved while signed out is merged into the account at sign-in, then removed from the device's signed-out slot.
7. **Status.** A small "Saved / Saving / Offline / Not saved" line (`SyncStatus`) tells the reader where their changes are.

### Messages (`src/lib/messages.ts`)

- **Sending is local-first too.** A message appears at once as "Sending in N s" with **Undo**, waits 10 s, then goes through `postComment`. It stays in a queue in the browser until the server confirms it. Closing the tab inside the window hands it to `syncBeacon`; each message has a one-time id (the stored document is `<uid>_<id>`), so a repeat from the beacon, a retry or another tab never duplicates it. A message the server refuses stays visible as "Not sent: reason" and can be edited and sent again; the 30-second rule shows as "Waiting a moment" instead of failing.
- **Reading is cached.** Messages are cached in the browser. The state document's `m` says when the latest message happened, so the page asks the server only for what changed since the cache (`updatedAt` watermark), and only if something did. A full refresh runs about once a day to pick up deletions. The unread badge reads `n` from the state document loaded at sign-in; there is no polling.
- **Server side.** One atomic write creates the message and bumps `n`/`m` for the recipient (the author's uid is in `config/author`, written by `scripts/set-role.mjs`) and `m` for the sender.
- **Limits of the cache.** Edits and deletions made by the other person show up at the next full refresh (about a day) or the next new message. The author's cache holds the latest 500 messages.

## Backend (Firebase Auth, Firestore, Functions)

Phase 3 adds accounts. The site stays static; sign-in, profiles and later comments load as small client-side islands.

- `firestore.rules`: default deny. `users/{uid}` is one small state document per reader (see below) and `comments/{id}` holds the messages; nothing else exists. A reader can read and change only their own document, and only `b`, `p`, `s` (and reset `n` to 0), each capped in size. Roles are custom claims (`user`, `author`, `moderator`, `admin`), not stored data.
- `functions/` (region `asia-south1`): `postComment` (the only way to create a message), `syncBeacon` (receives unsynced data while a page is closing) and `onUserDeleted` (erases an account's data). There is no function that runs at sign-up: a reader's name lives in their sign-in record and the state document is created by the reader's first sync. If `onUserCreated` is still deployed from an earlier version, delete it once: `firebase functions:delete onUserCreated --region asia-south1 --project <id>`.
- **Library** (`/library/`): bookmarks, parts of posts you are part way through, and finished posts, saved on this device and on your account when signed in. A bookmark button sits with the article actions, reading progress is tracked as you scroll (furthest point only, with a "pick up where you left off" offer), and series pages show "2 / 4" with a Continue button. Theme (light / dark / system) is a synced setting on the profile page.
- Accounts (email and password only): `/login/`, `/register/`, `/reset/`, `/profile/` (noindex, outside search and sitemap) and the header account menu. The username lives in the sign-in record (there is no profile document); the role is a custom claim that only the server sets. Verification is opt-in: after signing up, a bar at the top of every page offers "Send verification email", then "I have verified". Nothing is emailed automatically.
- `src/lib/firebase.ts`: lazy client for Auth and Firestore. Without the `PUBLIC_FIREBASE_*` variables (see `.env.example`) it is inert and the site works as before.
- Comments are **private conversations** between a reader and the author (`src/components/comments/Comments.tsx`). A verified reader writes to the author; only the author (role `admin`) replies, and that reader can answer back. Nobody else can see a thread: every message carries `threadOwnerId` and the rules show it only to that reader and the author. Because nothing is public there is nothing to approve and no AI moderation. Messages are created only by the `postComment` function, which also refuses obvious spam (more than 2 links, long repeated characters, duplicates) and rate-limits (30 s between messages, 10 per hour). Readers can edit or delete their own messages; the author can delete any.
- **Inbox** (`/inbox/`, in the account menu with a count of what is new): every conversation across all posts, for the reader (their own) and for the author (everyone's, with a "Needs a reply" tab). Replies can be written right there. "New" means the other side has the latest message and it is newer than your last visit (this device's last visit; the unread count `n` is synced, which clears when you open the inbox).
- Deleting an account deletes its state document, every message it wrote and every thread it started (`onUserDeleted`). Give yourself the role with `cd functions && npm ci && node scripts/set-role.mjs you@example.com admin`, then sign out and back in.
- Local work: `pnpm emulators` starts Auth, Firestore and Functions. Set `PUBLIC_USE_EMULATORS=true` to point the site at them. `pnpm test:rules` runs the rules tests against the Firestore emulator (needs Java).
- CI: the `backend` job runs the rules tests and compiles the functions; it must pass before preview or deploy.
- **Deploys are automatic** once `DEPLOY_BACKEND=true` is set as a repository variable: on every push to `main`, after the checks, the workflow deploys the Firestore rules, indexes and every function exported from `functions/src/index.ts` (and only those; other functions in the project are never touched), then hosting. The deploy account needs the roles listed below; without the variable only hosting is deployed. Manual fallback: `firebase deploy --only firestore:rules,firestore:indexes,functions:onUserCreated,functions:onUserDeleted,functions:postComment --project <id>` (never a bare `--only functions`, which offers to delete other functions in a shared project). To let CI deploy the backend, grant the deploy service account these roles once (Cloud Shell), then add the repository variable `DEPLOY_BACKEND` = `true`:

```
P=stride-11129; SA=github-deployer@$P.iam.gserviceaccount.com
for R in roles/cloudfunctions.admin roles/iam.serviceAccountUser roles/firebaserules.admin roles/datastore.indexAdmin roles/serviceusage.serviceUsageConsumer roles/artifactregistry.writer roles/cloudbuild.builds.editor; do
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role="$R" --condition=None --quiet
done
```

If the first run reports a missing permission, add the role it names (or `roles/firebase.admin`, which covers everything).
