// Maps SI API player names (and WP site staff names) to Wasabi player photo keys.
// Keys are under players/ in the ab-media bucket.

function toSlug(name: string): string {
  return (
    name
      // Danish æ/ø/å aren't decomposable via NFD (they're distinct letters, not
      // letter+diacritic like é/ü/ñ), so without this they fall through to the
      // catch-all strip below and vanish entirely — "Søren Ilsøe" became
      // "s-ren-ils-e" instead of "soren-ilsoe".
      .replace(/æ/gi, 'ae')
      .replace(/ø/gi, 'oe')
      .replace(/å/gi, 'aa')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/'/g, '') // apostrophes (O'Vonte → ovonte)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
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
  'anton-boye',
  'noah-maale',
]);

// Shirt numbers to hide the photo for — either no photo exists anywhere yet
// (14, 24: not on Wasabi, and SI's own player photo CDN only has a generic
// ~2KB placeholder, unchanged since 2024), or a real photo exists (3, 4, 10,
// 17) but it's from the old kit/season (Carlsberg-branded, pre-MYRIAD360), so
// it's withheld until a current one is shot. Card keeps showing name,
// position, and number regardless.
export const PENDING_PHOTO_SHIRT_NUMBERS = new Set<number>([
  3, 4, 10, 14, 17, 24,
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
// The file may not exist in Wasabi — callers should handle 404 with a fallback
// (see getSIPlayerPhotoUrl).
export function getPlayerPhotoUrl(
  name: string | null | undefined
): string | null {
  const key = getPlayerPhotoKey(name);
  return key ? `/api/media/${key}` : null;
}

// SI's own player-photo CDN — same host/path shape as the incident-list and
// momentum widgets use for player headshots, keyed by SI player id rather
// than name. Confirmed to hold real (recently shot) photos for several
// players we don't have our own Wasabi upload for yet — used as a fallback
// when the Wasabi photo 404s, rather than hiding the card photo outright.
export function getSIPlayerPhotoUrl(
  siPlayerId: number,
  teamId: number
): string {
  return `https://driu3sl4x7vty.cloudfront.net/spdk/current/262x292/${teamId}/${siPlayerId}.png`;
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
  ].map((slug) => [slug, 'left bottom'])
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
