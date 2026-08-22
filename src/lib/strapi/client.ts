import { strapi } from '@strapi/client';
import { cache } from '@/lib/strapi-revalidate';
import { isPreviewEnabled } from '@/lib/preview-context';
import { normalizeApostrophes } from '@/lib/utils';
import {
  getPlayerPhotoUrl,
  getSIPlayerPhotoUrl,
  getPlayerPhotoPosition,
  getPhotoPositionForSlug,
} from '@/lib/si/player-photos';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries transient Strapi failures (503s under load, the client's own 10s
 * request timeout aborting) with a short backoff — Strapi Cloud bursts of
 * concurrent requests routinely 503 for a moment and then recover, so most
 * failures here succeed on the 2nd or 3rd attempt rather than ever reaching
 * the cache fallback. A 404 (genuinely missing document/slug/id) is not
 * retried — that's a real answer, not a transient failure.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNotFound = err instanceof Error && err.name === 'HTTPNotFoundError';
      if (isNotFound || attempt === attempts) throw err;
      await sleep(300 * attempt);
    }
  }
  throw new Error('unreachable');
}

export async function fetchCollectionType<T = unknown[]>(
  collectionName: string,
  options?: QueryParams,
  cacheOptions?: { ttl?: number },
): Promise<T> {
  const preview = isPreviewEnabled();
  const doFetch = async () => {
    const { data } = await createClient()
      .collection(collectionName)
      .find({ ...options, status: preview ? 'draft' : 'published' } as never);
    return data as T;
  };
  // Draft content must never be written to the shared cache — it isn't keyed on
  // draft/published status, so caching here would either leak drafts to public
  // visitors or serve stale published data back to the previewing editor.
  if (preview) return withRetry(doFetch);
  // Must resolve to `null` (never throw) on failure — `CacheManager.getWithFallback`
  // only falls back to the last-known-good cached copy when the fetcher returns
  // `null`; a thrown error would otherwise skip the fallback and bubble up as an
  // empty result straight to the page.
  const fetcher = async () => {
    try {
      return await withRetry(doFetch);
    } catch (err) {
      console.error(`[strapi] fetchCollectionType(${collectionName}) failed:`, err);
      return null;
    }
  };
  const key = await cacheKey(collectionName, options);
  const result = await cache.getWithFallback<T>(key, fetcher, {
    tags: [collectionName],
    ttl: cacheOptions?.ttl,
  });
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
  cacheOptions?: { ttl?: number },
): Promise<{ data: T; pagination: StrapiPagination }> {
  const preview = isPreviewEnabled();
  const emptyPagination: StrapiPagination = {
    page: options?.pagination?.page ?? 1,
    pageSize: options?.pagination?.pageSize ?? 0,
    pageCount: 0,
    total: 0,
  };
  const doFetch = async () => {
    const res = await createClient()
      .collection(collectionName)
      .find({ ...options, status: preview ? 'draft' : 'published' } as never);
    return { data: res.data as T, pagination: (res.meta as { pagination: StrapiPagination })?.pagination };
  };
  if (preview) return withRetry(doFetch);
  const fetcher = async () => {
    try {
      return await withRetry(doFetch);
    } catch (err) {
      console.error(`[strapi] fetchCollectionTypeWithMeta(${collectionName}) failed:`, err);
      return null;
    }
  };
  const key = (await cacheKey(collectionName, options)) + '-meta';
  const result = await cache.getWithFallback(key, fetcher, {
    tags: [collectionName],
    ttl: cacheOptions?.ttl,
  });
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
  const doFetch = async () => {
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
  if (preview) return withRetry(doFetch);
  const fetcher = async () => {
    try {
      return await withRetry(doFetch);
    } catch (err) {
      console.error(`[strapi] fetchSingleType(${singleTypeName}) failed:`, err);
      return null;
    }
  };
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
  const doFetch = async () => {
    const { data } = await createClient()
      .collection(collectionName)
      .findOne(documentId, { ...options, status: preview ? 'draft' : 'published' } as never);
    return data as T;
  };
  if (preview) return withRetry(doFetch);
  const fetcher = async () => {
    try {
      return await withRetry(doFetch);
    } catch (err) {
      console.error(`[strapi] fetchDocument(${collectionName}/${documentId}) failed:`, err);
      return null;
    }
  };
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

export type PlayerPhotoPosition = 'left-bottom' | 'center-bottom' | 'right-bottom';

/** Maps the Strapi `photoPosition` enum to the CSS `object-position` value it represents. */
const PHOTO_POSITION_CSS: Record<PlayerPhotoPosition, string> = {
  'left-bottom': 'left bottom',
  'center-bottom': 'center bottom',
  'right-bottom': 'right bottom',
};

export interface StrapiMediaRef {
  url: string;
}

export interface StrapiPlayer {
  siPlayerId: number;
  nickname?: string;
  formerClubs?: string;
  bio?: string;
  quote?: string;
  gallery?: StrapiPlayerGalleryImage[];
  photo?: StrapiMediaRef;
  photoPosition?: PlayerPhotoPosition;
  hidePhoto?: boolean;
  hideFromSquad?: boolean;
  displayNameOverride?: string;
  shirtNumberOverride?: number;
  positionOverride?: 'keeper' | 'defender' | 'midfielder' | 'forward';
}

const PLAYER_PHOTO_POPULATE = {
  photo: { fields: ['url'] },
  gallery: { fields: ['url', 'alternativeText', 'width', 'height'] },
};

/** Fetch optional CMS content/overrides for a player by their SI player ID. Returns null if none exist anywhere. */
export async function fetchPlayerCmsData(
  siPlayerId: number,
  locale = 'da',
): Promise<StrapiPlayer | null> {
  const results = await fetchCollectionType<StrapiPlayer[]>('players', {
    filters: { siPlayerId: { $eq: siPlayerId } },
    populate: PLAYER_PHOTO_POPULATE,
    locale,
  }).catch(() => []);

  if (results[0]) {
    const row = results[0];
    return {
      ...row,
      displayNameOverride: row.displayNameOverride
        ? normalizeApostrophes(row.displayNameOverride)
        : row.displayNameOverride,
    };
  }

  // Static fallback — used when Strapi is unreachable or this player hasn't
  // been entered into the players collection yet.
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
    displayNameOverride: entry.name
      ? normalizeApostrophes(entry.name)
      : entry.name,
    shirtNumberOverride: entry.shirtNumber,
    positionOverride: entry.position,
    // hidePhoto/hideFromSquad deliberately left unset (not `false`) here — a
    // real Strapi row always has these as an explicit boolean (schema
    // default), so `undefined` is how callers distinguish "no Strapi row
    // exists yet" from "Strapi row exists and says false", letting them
    // still consult a legacy static fallback (e.g. PENDING_PHOTO_SHIRT_NUMBERS)
    // only in the former case.
  };
}

/**
 * Batch-fetch every player override row for `locale` in one request, keyed by
 * SI player ID — used by the squad list so it doesn't issue one Strapi call
 * per roster player. Includes `hideFromSquad: true` rows; filtering them out
 * of the squad view is the caller's responsibility.
 */
export async function fetchAllPlayerOverrides(
  locale: string,
): Promise<Map<number, StrapiPlayer>> {
  const rows = await fetchCollectionType<StrapiPlayer[]>('players', {
    locale,
    pagination: { pageSize: 200 },
    populate: PLAYER_PHOTO_POPULATE,
  }).catch(() => []);
  return new Map(
    rows.map((row) => [
      row.siPlayerId,
      row.displayNameOverride
        ? { ...row, displayNameOverride: normalizeApostrophes(row.displayNameOverride) }
        : row,
    ])
  );
}

export interface ResolvedPlayerPhoto {
  photoUrl: string | null;
  photoFallbackUrl: string | null;
  photoPosition: string;
}

/**
 * The single photo-resolution cascade shared by the squad list and player
 * detail pages: an explicit `hidePhoto` always wins (no photo, no fallback);
 * otherwise a Strapi-uploaded `photo` is trusted as-is; otherwise fall back to
 * the existing Wasabi-filename-guess system with SI's own CDN as an onerror
 * target.
 */
export function resolvePlayerPhoto(params: {
  hidePhoto: boolean;
  strapiPhoto?: StrapiMediaRef | null;
  strapiPhotoPosition?: PlayerPhotoPosition | null;
  siName: string | null | undefined;
  siPlayerId: number;
  teamId: number;
}): ResolvedPlayerPhoto {
  if (params.hidePhoto) {
    return { photoUrl: null, photoFallbackUrl: null, photoPosition: 'left bottom' };
  }
  if (params.strapiPhoto?.url) {
    return {
      photoUrl: strapiMediaUrl(params.strapiPhoto.url),
      photoFallbackUrl: null,
      photoPosition: PHOTO_POSITION_CSS[params.strapiPhotoPosition ?? 'left-bottom'],
    };
  }
  return {
    photoUrl: getPlayerPhotoUrl(params.siName),
    photoFallbackUrl:
      params.siPlayerId > 0 ? getSIPlayerPhotoUrl(params.siPlayerId, params.teamId) : null,
    photoPosition: getPlayerPhotoPosition(params.siName),
  };
}

// ── Staff roster ──────────────────────────────────────────────────────────────

export interface StrapiStaffMember {
  slug: string;
  name: string;
  role: string;
  nationality?: string;
  photo?: StrapiMediaRef;
  photoPosition?: PlayerPhotoPosition;
  hidePhoto?: boolean;
  hidden?: boolean;
  bio?: string;
  sortOrder?: number;
}

/** A staff roster entry with photo/role/nationality already resolved to a single locale. */
export interface StaffRosterEntry {
  slug: string;
  name: string;
  role: string;
  nationality: string | null;
  photoUrl: string | null;
  photoPosition: string;
  bio: string | null;
  sortOrder: number;
}

function resolveStaffPhoto(params: {
  hidePhoto: boolean;
  strapiPhoto?: StrapiMediaRef | null;
  strapiPhotoPosition?: PlayerPhotoPosition | null;
  fallbackPhotoUrl: string | null;
  fallbackPhotoPosition: string;
}): { photoUrl: string | null; photoPosition: string } {
  if (params.hidePhoto) return { photoUrl: null, photoPosition: 'left bottom' };
  if (params.strapiPhoto?.url) {
    return {
      photoUrl: strapiMediaUrl(params.strapiPhoto.url),
      photoPosition: PHOTO_POSITION_CSS[params.strapiPhotoPosition ?? 'left-bottom'],
    };
  }
  return { photoUrl: params.fallbackPhotoUrl, photoPosition: params.fallbackPhotoPosition };
}

async function staffFallbackEntries(
  locale: string,
  excludeSlugs: Set<string>,
): Promise<StaffRosterEntry[]> {
  const { COACHING_STAFF } = await import('@/data/coaching-staff');
  const l = locale === 'en' ? 'en' : 'da';
  return COACHING_STAFF.filter((staff) => !excludeSlugs.has(staff.slug)).map((staff, index) => ({
    slug: staff.slug,
    name: staff.name,
    role: staff.role[l],
    nationality: staff.nationality[l],
    photoUrl: staff.photo,
    photoPosition: getPhotoPositionForSlug(staff.slug),
    bio: staff.bio?.[l] ?? null,
    // Sorts after any Strapi-authored entry by default until re-ordered in admin.
    sortOrder: 1000 + index * 10,
  }));
}

/** Fetch the full staff roster for `locale`: Strapi rows merged with a per-record fallback to COACHING_STAFF for anyone not yet migrated. */
export async function fetchStaffRoster(locale: string): Promise<StaffRosterEntry[]> {
  const rows = await fetchCollectionType<StrapiStaffMember[]>('staff-members', {
    locale,
    sort: ['sortOrder:asc'],
    populate: { photo: { fields: ['url'] } },
  }).catch(() => []);

  const visible = rows.filter((row) => !row.hidden);
  // A migrated staffer's Strapi row exists for its own reasons (role/bio edits)
  // but may not have a `photo` uploaded yet — fall back to their pre-existing
  // Wasabi photo (keyed the same way COACHING_STAFF always has), not a blank
  // photo, until someone uploads a real one in Strapi admin.
  const { COACHING_STAFF } = await import('@/data/coaching-staff');
  const legacyBySlug = new Map(COACHING_STAFF.map((staff) => [staff.slug, staff]));
  const strapiEntries: StaffRosterEntry[] = visible.map((row) => {
    const legacy = legacyBySlug.get(row.slug);
    const photo = resolveStaffPhoto({
      hidePhoto: row.hidePhoto ?? false,
      strapiPhoto: row.photo,
      strapiPhotoPosition: row.photoPosition,
      fallbackPhotoUrl: legacy?.photo ?? null,
      fallbackPhotoPosition: getPhotoPositionForSlug(row.slug),
    });
    return {
      slug: row.slug,
      name: row.name,
      role: row.role,
      nationality: row.nationality ?? null,
      photoUrl: photo.photoUrl,
      photoPosition: photo.photoPosition,
      bio: row.bio ?? null,
      sortOrder: row.sortOrder ?? 0,
    };
  });

  const migratedSlugs = new Set(rows.map((row) => row.slug));
  const fallbackEntries = await staffFallbackEntries(locale, migratedSlugs);

  return [...strapiEntries, ...fallbackEntries].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Fetch a single staff member by slug, falling back to COACHING_STAFF if not yet in Strapi (or hidden there). Returns null if neither has them. */
export async function fetchStaffMember(
  slug: string,
  locale: string,
): Promise<StaffRosterEntry | null> {
  const results = await fetchCollectionType<StrapiStaffMember[]>('staff-members', {
    filters: { slug: { $eq: slug } },
    locale,
    populate: { photo: { fields: ['url'] } },
  }).catch(() => []);

  const row = results[0];
  if (row && !row.hidden) {
    // Same rationale as fetchStaffRoster: fall back to the pre-existing Wasabi
    // photo, not a blank one, until a real photo is uploaded in Strapi.
    const { COACHING_STAFF } = await import('@/data/coaching-staff');
    const legacy = COACHING_STAFF.find((staff) => staff.slug === row.slug);
    const photo = resolveStaffPhoto({
      hidePhoto: row.hidePhoto ?? false,
      strapiPhoto: row.photo,
      strapiPhotoPosition: row.photoPosition,
      fallbackPhotoUrl: legacy?.photo ?? null,
      fallbackPhotoPosition: getPhotoPositionForSlug(row.slug),
    });
    return {
      slug: row.slug,
      name: row.name,
      role: row.role,
      nationality: row.nationality ?? null,
      photoUrl: photo.photoUrl,
      photoPosition: photo.photoPosition,
      bio: row.bio ?? null,
      sortOrder: row.sortOrder ?? 0,
    };
  }

  // Not in Strapi (or explicitly hidden there) — fall back to the static roster.
  const { COACHING_STAFF } = await import('@/data/coaching-staff');
  const staff = COACHING_STAFF.find((s) => s.slug === slug);
  if (!staff) return null;

  const l = locale === 'en' ? 'en' : 'da';
  return {
    slug: staff.slug,
    name: staff.name,
    role: staff.role[l],
    nationality: staff.nationality[l],
    photoUrl: staff.photo,
    photoPosition: getPhotoPositionForSlug(staff.slug),
    bio: staff.bio?.[l] ?? null,
    sortOrder: 0,
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

type MatchArticleLinkRole = 'pre_match' | 'post_match' | 'community_news' | 'other' | 'away_travel';

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
  awayTravelArticle: StrapiMatchArticle | null;
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
      populate: { image: { fields: ['url', 'alternativeText'] } },
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
    awayTravelArticle: resolveRole('away_travel')[0] ?? null,
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

export interface StrapiPartnerContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface StrapiPartner {
  slug: string;
  name: string;
  logo: StrapiPartnerLogo;
  url?: string;
  logoWidth: number;
  logoHeight: number;
  sortOrder: number;
  category: 'supreme' | 'premium' | 'local-hero' | 'ab1889';
  description?: string;
  howLong?: string;
  highlights?: string;
  keyContacts?: StrapiPartnerContact[];
}

/**
 * Fetch all published partners ordered by sortOrder.
 *
 * Defaults to the canonical `da` locale regardless of the page's own locale —
 * consumers that only render locale-agnostic fields (logo, name, url, sizing —
 * e.g. the footer logo strip) should not risk a partner vanishing just
 * because its `en` locale row hasn't been created yet in Strapi. Callers that
 * need locale-accurate content (the partners listing/detail pages) should
 * pass the page's own locale explicitly.
 */
export async function fetchPartners(locale = 'da'): Promise<StrapiPartner[]> {
  return fetchCollectionType<StrapiPartner[]>('partners', {
    populate: ['logo', 'keyContacts'],
    sort: ['sortOrder:asc'],
    status: 'published',
    locale,
  }).catch(() => []);
}

/** Fetch a single published partner by slug, resolved to `locale`. Returns null if not found. */
export async function fetchPartnerBySlug(
  slug: string,
  locale = 'da',
): Promise<StrapiPartner | null> {
  const results = await fetchCollectionType<StrapiPartner[]>('partners', {
    filters: { slug: { $eq: slug } },
    populate: ['logo', 'keyContacts'],
    status: 'published',
    locale,
  }).catch(() => []);
  return results[0] ?? null;
}

// ── Hero slider ────────────────────────────────────────────────────────────────

export interface StrapiHeroSlideMedia {
  url: string;
  width?: number;
  height?: number;
}

export interface StrapiHeroSlide {
  name: string;
  slideType: 'image' | 'video';
  sortOrder: number;
  image?: StrapiHeroSlideMedia;
  video?: StrapiHeroSlideMedia;
  headline?: string;
  subtitle?: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaVariant: 'btn-beige' | 'btn-green' | 'btn-dark';
  alt?: string;
}

/** Fetch all published hero slides ordered by sortOrder, resolved to `locale`. */
export async function fetchHeroSlides(locale: string): Promise<StrapiHeroSlide[]> {
  return fetchCollectionType<StrapiHeroSlide[]>('hero-slides', {
    locale,
    sort: ['sortOrder:asc'],
    populate: {
      image: { fields: ['url', 'width', 'height'] },
      video: { fields: ['url'] },
    },
  }).catch(() => []);
}

// ── Leadership ─────────────────────────────────────────────────────────────────

export interface StrapiLeadershipMemberPhoto {
  url: string;
}

export interface StrapiLeadershipMember {
  name: string;
  section: 'board' | 'exec' | 'sporting';
  role: string;
  photo?: StrapiLeadershipMemberPhoto;
  photoPosition: 'object-center' | 'object-top';
  bio?: string;
  sortOrder: number;
}

/** Fetch all published leadership members (board/exec/sporting) ordered by sortOrder, resolved to `locale`. */
export async function fetchLeadership(locale: string): Promise<StrapiLeadershipMember[]> {
  return fetchCollectionType<StrapiLeadershipMember[]>('leadership-members', {
    locale,
    sort: ['sortOrder:asc'],
    populate: { photo: { fields: ['url'] } },
  }).catch(() => []);
}

export interface StrapiInvestor {
  name: string;
  since?: string;
  stake?: string;
  description?: string;
  sortOrder: number;
}

/** Fetch all published investors ordered by sortOrder, resolved to `locale`. */
export async function fetchInvestors(locale: string): Promise<StrapiInvestor[]> {
  return fetchCollectionType<StrapiInvestor[]>('investors', {
    locale,
    sort: ['sortOrder:asc'],
  }).catch(() => []);
}

// ── Media helpers ─────────────────────────────────────────────────────────────

const WASABI_HOST_RE = /^https?:\/\/[^/]*wasabisys\.com\//;
// Strapi Cloud's built-in media CDN — e.g. https://supportive-miracle-581511a57f.media.strapiapp.com/foo.jpg
const STRAPI_CDN_RE = /^https?:\/\/[a-z0-9-]+\.media\.strapiapp\.com\/(.+)$/i;

/** Extracts the bucket object key from a private Wasabi URL (stripping the presigned query string), or null if `url` isn't a Wasabi URL. */
export function wasabiObjectKey(url: string | null | undefined): string | null {
  if (!url || !WASABI_HOST_RE.test(url)) return null;
  return url.replace(WASABI_HOST_RE, '').split('?')[0];
}

export function strapiMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Route private Wasabi objects through the server-side proxy
  const wasabiKey = wasabiObjectKey(url);
  if (wasabiKey) {
    return `/api/media/${wasabiKey}`;
  }
  // Route Strapi Cloud's CDN through our own proxy so the ab.dk domain never
  // exposes the underlying strapiapp.com hostname to visitors.
  const cdnMatch = url.match(STRAPI_CDN_RE);
  if (cdnMatch) {
    return `/media/${cdnMatch[1]}`;
  }
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}
