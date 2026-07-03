import { strapi } from '@strapi/client';
import { cache } from '@/lib/strapi-revalidate';

const STRAPI_URL = (import.meta.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '');
const STRAPI_TOKEN: string | undefined = import.meta.env.STRAPI_API_TOKEN;

type QueryParams = {
  locale?: string;
  status?: 'draft' | 'published';
  sort?: string | string[];
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  fields?: string[];
  pagination?: { page?: number; pageSize?: number; start?: number; limit?: number };
};

function createClient() {
  return strapi({
    baseURL: `${STRAPI_URL}/api`,
    auth: STRAPI_TOKEN || undefined,
  });
}

function cacheKey(name: string, options?: QueryParams): string {
  return `strapi-${name}-${JSON.stringify(options ?? {})}`;
}

export async function fetchCollectionType<T = unknown[]>(
  collectionName: string,
  options?: QueryParams,
): Promise<T> {
  const key = cacheKey(collectionName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .find({ ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [collectionName] },
  );
  return result ?? ([] as unknown as T);
}

export async function fetchSingleType<T = unknown>(
  singleTypeName: string,
  options?: QueryParams,
): Promise<T> {
  const key = cacheKey(singleTypeName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .single(singleTypeName)
        .find({ ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [singleTypeName] },
  );
  return result as T;
}

export async function fetchDocument<T = unknown>(
  collectionName: string,
  documentId: string,
  options?: QueryParams,
): Promise<T> {
  const key = `strapi-${collectionName}-doc-${documentId}-${JSON.stringify(options ?? {})}`;
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .findOne(documentId, { ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [collectionName] },
  );
  return result as T;
}

// ── Player CMS data ───────────────────────────────────────────────────────────

export interface StrapiPlayerGalleryImage {
  url: string;
  alternativeText?: string;
  width: number;
  height: number;
}

export interface StrapiPlayer {
  siPlayerId: number;
  nickname?: string;
  formerClubs?: string;
  bio?: string;
  quote?: string;
  gallery?: StrapiPlayerGalleryImage[];
}

/** Fetch optional CMS content for a player by their SI player ID. Returns null if not found. */
export async function fetchPlayerCmsData(
  siPlayerId: number,
  locale = 'da',
): Promise<StrapiPlayer | null> {
  const results = await fetchCollectionType<StrapiPlayer[]>('players', {
    filters: { siPlayerId: { $eq: siPlayerId } },
    populate: ['gallery'],
    locale,
  }).catch(() => []);

  if (results[0]) return results[0];

  // Static fallback — used when Strapi is unreachable or the player collection
  // hasn't been seeded yet.
  const { PLAYER_CMS_DATA } = await import('@/data/player-cms-data');
  const entry = PLAYER_CMS_DATA[siPlayerId];
  if (!entry) return null;

  const l = locale === 'en' ? 'en' : 'da';
  return {
    siPlayerId,
    nickname: entry.nickname,
    formerClubs: entry.formerClubs,
    bio: entry.bio?.[l],
    quote: entry.quote?.[l],
  };
}

// ── Media helpers ─────────────────────────────────────────────────────────────

const WASABI_HOST_RE = /^https?:\/\/[^/]*wasabisys\.com\//;

export function strapiMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Route private Wasabi objects through the server-side proxy
  if (WASABI_HOST_RE.test(url)) {
    const key = url.replace(WASABI_HOST_RE, '');
    return `/api/media/${key}`;
  }
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}
