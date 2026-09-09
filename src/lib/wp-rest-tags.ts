import type { APIContext } from 'astro';

import { setCdnCacheHeaders } from '@/lib/http-cache';
import {
  fetchCollectionType,
  fetchCollectionTypeWithMeta,
} from '@/lib/strapi/client';
import { decodeHtml } from '@/lib/utils';

interface StrapiCategory {
  id: number;
  name: string;
  articles?: { id: number }[];
}

const MAX_PER_PAGE = 100;

// WP tag slugs are plain ASCII — Danish names only ever add æ/ø/å beyond
// that, so a direct substitution table is all that's needed (no generic
// diacritic-stripping normalization required).
const DANISH_CHAR_MAP: Record<string, string> = {
  æ: 'ae',
  ø: 'oe',
  å: 'aa',
  Æ: 'ae',
  Ø: 'oe',
  Å: 'aa',
};

function slugifyCategoryName(name: string): string {
  const ascii = name
    .split('')
    .map((ch) => DANISH_CHAR_MAP[ch] ?? ch)
    .join('');
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapCategoryToWpTag(
  category: StrapiCategory,
  opts: { site: string; apiBasePath: string; newsListingPath: string }
): Record<string, unknown> {
  const { site, apiBasePath, newsListingPath } = opts;
  const name = decodeHtml(category.name);
  return {
    id: category.id,
    count: category.articles?.length ?? 0,
    description: '',
    link: `${site}${newsListingPath}`,
    name,
    slug: slugifyCategoryName(name),
    taxonomy: 'post_tag',
    meta: [],
    _links: {
      self: [{ href: `${site}${apiBasePath}/${category.id}` }],
      collection: [{ href: `${site}${apiBasePath}` }],
    },
  };
}

/** Fetch a single category by its Strapi id — used by the `/tags/{id}` shim. */
async function fetchCategoryById(
  locale: 'da' | 'en',
  id: number
): Promise<StrapiCategory | null> {
  const categories = await fetchCollectionType<StrapiCategory[]>('categories', {
    locale,
    filters: { id: { $eq: id } },
    populate: { articles: { fields: ['id'] } },
  }).catch(() => []);
  return categories[0] ?? null;
}

/** WordPress REST API's standard "no such term" error shape and status. */
function wpTagNotFoundResponse(): Response {
  return new Response(
    JSON.stringify({
      code: 'rest_term_invalid',
      message: 'Term does not exist.',
      data: { status: 404 },
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    }
  );
}

/**
 * WordPress REST API v2 tags-list compatibility shim for `/wp-json/wp/v2/tags`
 * — Strapi has no separate tags taxonomy, only `categories`, so those are
 * reshaped into WP tag objects (the closest real data Strapi has, rather than
 * proxying the old WP site live or returning an always-empty list).
 */
export async function buildWpTagsResponse(
  context: APIContext,
  locale: 'da' | 'en',
  apiBasePath: string,
  newsListingPath: string
): Promise<Response> {
  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
  const params = context.url.searchParams;

  const perPage = Math.min(
    Math.max(parseInt(params.get('per_page') ?? '10', 10) || 10, 1),
    MAX_PER_PAGE
  );
  const page = Math.max(parseInt(params.get('page') ?? '1', 10) || 1, 1);

  const { data: categories, pagination } = await fetchCollectionTypeWithMeta<
    StrapiCategory[]
  >('categories', {
    locale,
    sort: ['name:asc'],
    pagination: { page, pageSize: perPage },
    populate: { articles: { fields: ['id'] } },
  }).catch(() => ({
    data: [] as StrapiCategory[],
    pagination: { page, pageSize: perPage, pageCount: 0, total: 0 },
  }));

  const tags = categories.map((category) =>
    mapCategoryToWpTag(category, { site, apiBasePath, newsListingPath })
  );

  const headers = new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
    'X-WP-Total': String(pagination.total),
    'X-WP-TotalPages': String(pagination.pageCount),
  });
  // Same reasoning as buildWpPostsResponse — repeat/bot GETs with the same
  // query params should hit the CDN, not Strapi, on every poll.
  setCdnCacheHeaders(headers);

  return new Response(JSON.stringify(tags), { headers });
}

/**
 * WordPress REST API v2 single-tag compatibility shim for `/wp-json/wp/v2/tags/{id}`
 * — `{id}` is always a Strapi category id, since that's the only id
 * buildWpTagsResponse above ever hands out.
 */
export async function buildWpTagResponse(
  context: APIContext,
  locale: 'da' | 'en',
  apiBasePath: string,
  newsListingPath: string
): Promise<Response> {
  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
  const idParam = context.params.id;
  const id = idParam ? parseInt(idParam, 10) : NaN;
  if (!Number.isInteger(id) || id <= 0) return wpTagNotFoundResponse();

  const category = await fetchCategoryById(locale, id);
  if (!category) return wpTagNotFoundResponse();

  const tag = mapCategoryToWpTag(category, {
    site,
    apiBasePath,
    newsListingPath,
  });

  const headers = new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
  });
  setCdnCacheHeaders(headers);

  return new Response(JSON.stringify(tag), { headers });
}
