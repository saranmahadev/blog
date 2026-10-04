/**
 * Draft pages are built into a folder named by a secret, so the author can read them as real pages on the site.
 * The folder name is the only protection: anyone who has the link can open it. It is not a login.
 */
export const DRAFTS_ROOT = 'd';

/** Returns the secret, or undefined when the feature is off (nothing set). A set but malformed value fails the build. */
export function parseDraftsToken(raw: string | undefined): string | undefined {
  const token = (raw ?? '').trim();
  if (!token) return undefined;
  if (!/^[A-Za-z0-9]{16,128}$/.test(token)) {
    throw new Error('DRAFTS_TOKEN must be 16 to 128 letters or digits (for example the output of: openssl rand -hex 16).');
  }
  return token;
}

/** `<key>` is `<slug>` or `<series>/<post>`. */
export const draftUrl = (token: string, key: string) => `/${DRAFTS_ROOT}/${token}/${key}/`;
