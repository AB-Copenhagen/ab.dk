import { strapi } from '@strapi/client';
import { cache } from '@/lib/strapi-revalidate';
import { isPreviewEnabled } from '@/lib/preview-context';

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
  const preview = isPreviewEnabled();
  const fetcher = async () => {
    const { data } = await createClient()
      .collection(collectionName)
      .find({ ...options, status: preview ? 'draft' : 'published' } as never);
    return data as T;
  };
  // Draft content must never be written to the shared cache — it isn't keyed on
  // draft/published status, so caching here would either leak drafts to public
  // visitors or serve stale published data back to the previewing editor.
  if (preview) return fetcher();
  const key = await cacheKey(collectionName, options);
  const result = await cache.getWithFallback<T>(key, fetcher, { tags: [collectionName] });
  return result ?? ([] as unknown as T);
}

export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/** Like fetchCollectionType, but also returns Strapi's pagination meta (needed to render a pager). */
export async function fetchCollectionTypeWithMeta<T = unknown[]>(
  collectionName: string,
  options?: QueryParams,
): Promise<{ data: T; pagination: StrapiPagination }> {
  const preview = isPreviewEnabled();
  const emptyPagination: StrapiPagination = {
    page: options?.pagination?.page ?? 1,
    pageSize: options?.pagination?.pageSize ?? 0,
    pageCount: 0,
    total: 0,
  };
  const fetcher = async () => {
    const res = await createClient()
      .collection(collectionName)
      .find({ ...options, status: preview ? 'draft' : 'published' } as never);
    return { data: res.data as T, pagination: (res.meta as { pagination: StrapiPagination })?.pagination };
  };
  if (preview) return fetcher();
  const key = (await cacheKey(collectionName, options)) + '-meta';
  const result = await cache.getWithFallback(key, fetcher, { tags: [collectionName] });
  return result ?? { data: [] as unknown as T, pagination: emptyPagination };
}

// Sentinel cached in place of `null` when a single type genuinely has no
// entry — `CacheManager.getWithFallback` treats a `null` fetcher result as a
// failed fetch (skips caching, reads the fallback instead), which would mean
// a permanently-missing single type is refetched from Strapi on every single
// request forever. This is JSON-safe so it survives the file cache driver.
const SINGLE_TYPE_NOT_FOUND = '__strapi_single_type_not_found__';

export async function fetchSingleType<T = unknown>(
  singleTypeName: string,
  options?: QueryParams,
): Promise<T> {
  const preview = isPreviewEnabled();
  const fetcher = async () => {
    try {
      const { data } = await createClient()
        .single(singleTypeName)
        .find({ ...options, status: preview ? 'draft' : 'published' } as never);
      return data as T;
    } catch (err) {
      if (err instanceof Error && err.name === 'HTTPNotFoundError') {
        return SINGLE_TYPE_NOT_FOUND as unknown as T;
      }
      throw err;
    }
  };
  if (preview) return fetcher();
  const key = await cacheKey(singleTypeName, options);
  const result = await cache.getWithFallback<T>(key, fetcher, { tags: [singleTypeName] });
  return (result === (SINGLE_TYPE_NOT_FOUND as unknown as T) ? null : result) as T;
}

export async function fetchDocument<T = unknown>(
  collectionName: string,
  documentId: string,
  options?: QueryParams,
): Promise<T> {
  const preview = isPreviewEnabled();
  const fetcher = async () => {
    const { data } = await createClient()
      .collection(collectionName)
      .findOne(documentId, { ...options, status: preview ? 'draft' : 'published' } as never);
    return data as T;
  };
  if (preview) return fetcher();
  const key = `strapi-${collectionName}-doc-${documentId}-${JSON.stringify(options ?? {})}`;
  const result = await cache.getWithFallback<T>(key, fetcher, { tags: [collectionName] });
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
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  image?: { url: string; alternativeText?: string };
}

type MatchArticleLinkRole = 'pre_match' | 'post_match' | 'community_news' | 'other';

interface RawStrapiMatchArticleLink {
  role: MatchArticleLinkRole;
  article?: { documentId: string } | null;
}

interface RawStrapiMatchContent {
  eventId: number;
  ticketUrl?: string;
  accentColor?: string;
  bannerImage?: { url: string; alternativeText?: string; width?: number; height?: number };
  articleLinks?: RawStrapiMatchArticleLink[];
  socialEmbeds?: StrapiSocialEmbed[];
}

export interface StrapiMatchContent {
  eventId: number;
  ticketUrl?: string;
  accentColor?: string;
  bannerImage?: { url: string; alternativeText?: string; width?: number; height?: number };
  preMatchArticle: StrapiMatchArticle | null;
  postMatchArticle: StrapiMatchArticle | null;
  communityNewsArticles: StrapiMatchArticle[];
  otherArticles: StrapiMatchArticle[];
  socialEmbeds?: StrapiSocialEmbed[];
}

/**
 * Fetch optional CMS content for a match by SI event ID, resolved to `locale`.
 *
 * `articleLinks` only stores a relation to an article's shared documentId (the
 * same document across both da/en versions) — this fetches the actual
 * localized article data for the requested locale in a follow-up query,
 * rather than depending on Strapi's populate to guess the right locale for a
 * relation on a non-localized parent.
 */
export async function fetchMatchContent(
  eventId: number,
  locale: string,
): Promise<StrapiMatchContent | null> {
  const results = await fetchCollectionType<RawStrapiMatchContent[]>('match-contents', {
    filters: { eventId: { $eq: eventId } },
    populate: {
      bannerImage: true,
      socialEmbeds: true,
      articleLinks: { populate: { article: true } },
    },
    status: 'published',
  }).catch(() => []);
  const raw = results[0];
  if (!raw) return null;

  const links = raw.articleLinks ?? [];
  const documentIds = [
    ...new Set(links.map((link) => link.article?.documentId).filter((id): id is string => Boolean(id))),
  ];

  const articlesByDocumentId = new Map<string, StrapiMatchArticle>();
  if (documentIds.length > 0) {
    const articles = await fetchCollectionType<StrapiMatchArticle[]>('articles', {
      filters: { documentId: { $in: documentIds } },
      locale,
      populate: ['image'],
      status: 'published',
    }).catch(() => []);
    for (const article of articles) articlesByDocumentId.set(article.documentId, article);
  }

  const resolveRole = (role: MatchArticleLinkRole): StrapiMatchArticle[] =>
    links
      .filter((link) => link.role === role)
      .map((link) => (link.article ? articlesByDocumentId.get(link.article.documentId) : undefined))
      .filter((article): article is StrapiMatchArticle => Boolean(article));

  return {
    eventId: raw.eventId,
    ticketUrl: raw.ticketUrl,
    accentColor: raw.accentColor,
    bannerImage: raw.bannerImage,
    preMatchArticle: resolveRole('pre_match')[0] ?? null,
    postMatchArticle: resolveRole('post_match')[0] ?? null,
    communityNewsArticles: resolveRole('community_news'),
    otherArticles: resolveRole('other'),
    socialEmbeds: raw.socialEmbeds,
  };
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
