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

// WP category slugs are plain ASCII — Danish names only ever add æ/ø/å beyond
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

function mapCategoryToWpCategory(
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
    taxonomy: 'category',
    parent: 0,
    meta: [],
    _links: {
      self: [{ href: `${site}${apiBasePath}/${category.id}` }],
      collection: [{ href: `${site}${apiBasePath}` }],
    },
  };
}

/** Fetch a single category by its Strapi id — used by the `/categories/{id}` shim. */
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
function wpCategoryNotFoundResponse(): Response {
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
 * WordPress REST API v2 categories-list compatibility shim for
 * `/wp-json/wp/v2/categories` — reuses the same Strapi `categories` collection
 * as the `/tags` shim (see wp-rest-tags.ts for why: Strapi only has this one
 * taxonomy), just reshaped with `taxonomy: 'category'` so consumers that hit
 * the categories endpoint specifically still get a response instead of a 403.
 * The ids match the `categories` array WP posts shims already return
 * (`wp-rest-posts.ts`), since both read from the same Strapi collection.
 */
export async function buildWpCategoriesResponse(
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

  const wpCategories = categories.map((category) =>
    mapCategoryToWpCategory(category, { site, apiBasePath, newsListingPath })
  );

  const headers = new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
    'X-WP-Total': String(pagination.total),
    'X-WP-TotalPages': String(pagination.pageCount),
  });
  // Same reasoning as buildWpPostsResponse — repeat/bot GETs with the same
  // query params should hit the CDN, not Strapi, on every poll.
  setCdnCacheHeaders(headers);

  return new Response(JSON.stringify(wpCategories), { headers });
}

/**
 * WordPress REST API v2 single-category compatibility shim for
 * `/wp-json/wp/v2/categories/{id}` — `{id}` is always a Strapi category id,
 * since that's the only id buildWpCategoriesResponse above ever hands out.
 */
export async function buildWpCategoryResponse(
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
  if (!Number.isInteger(id) || id <= 0) return wpCategoryNotFoundResponse();

  const category = await fetchCategoryById(locale, id);
  if (!category) return wpCategoryNotFoundResponse();

  const wpCategory = mapCategoryToWpCategory(category, {
    site,
    apiBasePath,
    newsListingPath,
  });

  const headers = new Headers({
    'Content-Type': 'application/json; charset=UTF-8',
  });
  setCdnCacheHeaders(headers);

  return new Response(JSON.stringify(wpCategory), { headers });
}
