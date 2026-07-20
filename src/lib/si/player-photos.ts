// Maps SI API player names (and WP site staff names) to Wasabi player photo keys.
// Keys are under players/ in the ab-media bucket.

function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/'/g, '') // apostrophes (O'Vonte → ovonte)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Explicit overrides for names that differ between SI API and the WP site,
// or whose names contain non-ASCII characters that slug poorly.
const OVERRIDES: Record<string, string> = {
  'emil-mygind': 'players/emil-mygind-jensen.png',
  'milan-rasmussen': 'players/milan-silva-rasmussen.png',
  'noah-engell': 'players/noah-engell-christensen.png',
  // SI API returns "Soeren Ilsoee" (ASCII, double-e) → mapped to uploaded file
  'soeren-ilsoee': 'players/soren-ilsoe.png',
};

// Players to hide from squad display (e.g. out of contract).
export const EXCLUDED_PLAYER_SLUGS = new Set<string>([
  'daniel-a-pedersen',
  'jeppe-gertsen',
]);

export function getPlayerPhotoKey(
  name: string | null | undefined
): string | null {
  if (!name) return null;
  const slug = toSlug(name);
  if (OVERRIDES[slug]) return OVERRIDES[slug];
  return `players/${slug}.png`;
}

// Returns the proxy URL for a player photo, or null if name is empty.
// The file may not exist in Wasabi — callers should handle 404 with a fallback.
export function getPlayerPhotoUrl(
  name: string | null | undefined
): string | null {
  const key = getPlayerPhotoKey(name);
  return key ? `/api/media/${key}` : null;
}

// CSS `object-position` per photo, keyed by the Wasabi filename slug (not the
// SI-derived slug — same key as OVERRIDES' *values*, so this survives if a
// name-matching override changes). Default is 'left bottom', tuned against the
// original photo set. The 26-photo 2026/27 jersey shoot uses a wider, more
// "hands behind back" framing that isn't pre-cropped to the card's narrow
// panel — 'left bottom' crops those from one side only, cutting into the
// face/hand on that side. 'center bottom' crops evenly from both sides instead.
// Tune a specific player here (e.g. '35% bottom') if center still isn't right
// for their particular pose.
const POSITION_OVERRIDES: Record<string, string> = Object.fromEntries(
  [
    'marcus-bobjerg',
    'casper-grening',
    'soren-ilsoe',
    'milan-silva-rasmussen',
    'jonathan-mathys',
    'marcus-immersen',
    'mikkel-clement',
    'marco-vesterholm',
    'tobias-damtoft',
    'michael-stone',
    'tobias-lykkebak',
    'saliou-diop',
    'alfred-horup',
    'villum-gyrup-stokbro',
    'william-warrer',
    'mikkel-brund',
    'anton-boye',
    'frederik-lindgaard',
    'engelbert-owusu',
    'tobias-hageltorn',
    'noah-ibsen',
    'marc-dal-hende',
    'adam-ingi-benediktsson',
    'noah-engell-christensen',
    'ovonte-mullings',
    'emil-mygind-jensen',
  ].map((slug) => [slug, '-50% bottom'])
);

// Returns the CSS object-position value for a Wasabi photo slug (e.g. 'andreas-sondergaard').
// Shared by both name-resolved players (below) and staff, whose photo slug is
// already known directly (StaffMember.slug) without needing the SI name lookup.
export function getPhotoPositionForSlug(
  slug: string | null | undefined
): string {
  if (!slug) return 'left bottom';
  return POSITION_OVERRIDES[slug] ?? 'left bottom';
}

// Returns the CSS object-position value for a player's photo (e.g. 'left bottom').
export function getPlayerPhotoPosition(
  name: string | null | undefined
): string {
  const key = getPlayerPhotoKey(name);
  if (!key) return 'left bottom';
  const slug = key.replace(/^players\//, '').replace(/\.png$/, '');
  return getPhotoPositionForSlug(slug);
}
