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
