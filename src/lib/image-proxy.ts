// Shared between src/pages/api/media/[...key].ts (Wasabi) and
// src/pages/media/[...key].ts (Strapi Cloud CDN) — both proxy CMS-uploaded
// images and support the same `?w=` resize contract, so callers building a
// `strapiMediaUrl()` result don't need to know which backend a given image
// actually lives in.

// Mirrors astro.config's Vercel imagesConfig.sizes — a `?w=` request snaps to one of
// these instead of an arbitrary value, so each proxy's transcode cache has a bounded key
// space per object (an attacker varying `w` on every request can't force an unbounded
// number of distinct resize+encode operations).
export const ALLOWED_WIDTHS = [
  320, 400, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

export function resolveRequestedWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return ALLOWED_WIDTHS.find((w) => w >= n) ?? ALLOWED_WIDTHS.at(-1)!;
}

/** Small bounded LRU-ish cache for resized/transcoded image variants, reused across requests handled by the same warm instance. */
export interface CachedVariant {
  body: Uint8Array;
  contentType: string;
  etag: string;
}

export function createVariantCache(maxEntries: number) {
  const cache = new Map<string, CachedVariant>();
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: CachedVariant) => {
      if (cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, value);
    },
  };
}
