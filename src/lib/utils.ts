/** Decode HTML entities from Strapi content (&#8211;, &amp;, etc.) */
export function decodeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export const truncate = (text: string | null | undefined, length: number) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// Strapi `uid` slug fields are lowercase kebab-case (letters, numbers, hyphens) —
// no dots, so this alone rejects dotfiles/extensions (`.env`, `xmlrpc.php`,
// `config.json`, …), the bulk of scanner/bot noise hitting the catch-all [slug]
// route.
const SLUG_FORMAT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A handful of extensionless paths that are pure infrastructure-recon targets
// (never plausible as real page/article slugs on a football club site) and
// would otherwise pass the format check above.
const KNOWN_SCANNER_SLUGS = new Set([
  'wp-admin',
  'wp-login',
  'wp-content',
  'wp-includes',
  'wp-json',
  'xmlrpc',
  'phpmyadmin',
  'cgi-bin',
  'actuator',
]);

/**
 * True if `slug` is shaped like a real Strapi content slug — cheap enough to
 * run before spending a Strapi round trip on it. Used by the catch-all
 * `[slug].astro` routes to skip lookups for the scanner/bot traffic that
 * makes up most hits to unmatched single-segment paths.
 */
export function isPlausibleContentSlug(
  slug: string | undefined
): slug is string {
  if (!slug || !SLUG_FORMAT_RE.test(slug)) return false;
  return !KNOWN_SCANNER_SLUGS.has(slug);
}

/** Escape HTML special characters before interpolating untrusted input into an HTML string. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
