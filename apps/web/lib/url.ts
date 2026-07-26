/**
 * Shared http(s) link normalization for user/admin supplied reference URLs.
 * Runs on both client (inline validation) and server (trust boundary).
 */

const MAX_URL_LENGTH = 500;

/**
 * Accepts scheme-less input like `www.fragrantica.com/perfume/...` and
 * returns a canonical absolute URL, or `null` when the value can't be a
 * safe http(s) link.
 */
export function normalizeExternalUrl(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  // Reject bare hosts like `localhost` or accidental single words.
  if (!parsed.hostname.includes(".")) return null;

  const href = parsed.toString();
  return href.length <= MAX_URL_LENGTH ? href : null;
}
