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

// SI and Strapi disagree on apostrophe style — SI's raw API sometimes emits a
// curly apostrophe (either literal U+2019 or an HTML entity form) while other
// records use a straight one, so the same player's name renders inconsistently
// and slugifies to two different URLs depending on which source answered last
// (e.g. "O'Vonte Mullings" vs "O’Vonte Mullings"). Canonicalize to straight `'`
// as soon as a name enters the system, so every downstream consumer — display,
// slugify, JSON-LD — sees one consistent value.
export function normalizeApostrophes(str: string): string {
  return str
    .replace(
      /&rsquo;|&#8217;|&#x2019;|&lsquo;|&#8216;|&#x2018;|&apos;|&#39;|&#x27;/gi,
      "'"
    )
    .replace(/[‘’ʼ]/g, "'");
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

/** Lowercase, hyphenated ASCII slug (diacritics stripped) — for anchor IDs, not routing. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
