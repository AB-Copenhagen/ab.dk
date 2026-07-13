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

async function cacheKey(name: string, options?: QueryParams): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(options ?? {}));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `strapi-${name}-${hash}`;
}

export async function fetchCollectionType<T = unknown[]>(
  collectionName: string,
  options?: QueryParams,
): Promise<T> {
  const key = await cacheKey(collectionName, options);
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
  const key = await cacheKey(singleTypeName, options);
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

// ── Match day CMS content ─────────────────────────────────────────────────────

export interface StrapiSocialEmbed {
  platform: 'instagram' | 'twitter' | 'youtube' | 'facebook' | 'tiktok';
  embedCode: string;
  caption?: string;
}

export interface StrapiMatchArticle {
  id: number;
  title: string;
  slug: string;
  description?: string;
  image?: { url: string; alternativeText?: string };
}

export interface StrapiMatchContent {
  eventId: number;
  ticketUrl?: string;
  accentColor?: string;
  bannerImage?: { url: string; alternativeText?: string; width?: number; height?: number };
  articles?: StrapiMatchArticle[];
  socialEmbeds?: StrapiSocialEmbed[];
}

/** Fetch optional CMS content for a match by SI event ID. Returns null if not found. */
export async function fetchMatchContent(eventId: number): Promise<StrapiMatchContent | null> {
  const results = await fetchCollectionType<StrapiMatchContent[]>('match-contents', {
    filters: { eventId: { $eq: eventId } },
    populate: ['bannerImage', 'articles', 'articles.image', 'socialEmbeds'],
    status: 'published',
  }).catch(() => []);
  return results[0] ?? null;
}

// ── Partner / sponsor data ────────────────────────────────────────────────────

export interface StrapiPartnerLogo {
  url: string;
  alternativeText?: string;
  width: number;
  height: number;
}

export interface StrapiPartner {
  name: string;
  logo: StrapiPartnerLogo;
  url?: string;
  logoWidth: number;
  logoHeight: number;
  sortOrder: number;
  category: 'main' | 'kit' | 'media' | 'other';
}

/** Fetch all published partners ordered by sortOrder. Returns [] on error. */
export async function fetchPartners(): Promise<StrapiPartner[]> {
  return fetchCollectionType<StrapiPartner[]>('partners', {
    populate: ['logo'],
    sort: ['sortOrder:asc'],
    status: 'published',
  }).catch(() => []);
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
