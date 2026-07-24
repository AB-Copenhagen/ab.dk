import type { APIContext } from 'astro';

import { blocksToHtml } from '@/lib/blocks-to-html';
import {
  fetchCollectionTypeWithMeta,
  strapiMediaUrl,
} from '@/lib/strapi/client';
import { decodeHtml, escapeHtml } from '@/lib/utils';

interface StrapiArticle {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  slug: string;
  content?: unknown;
  categories?: { name: string }[];
  image?: { url: string; width?: number; height?: number };
  originalPublishedAt?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt: string;
}

const MAX_PER_PAGE = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Strapi Cloud rate-limits bursts of requests, so a single fetch can
// transiently fail (same issue sitemap.xml.ts's fetchPageWithRetry works
// around) — without a retry, a rate-limited request here silently returns
// an empty post list with a 200 status instead of a temporary error.
async function fetchArticlesWithRetry(
  locale: 'da' | 'en',
  page: number,
  pageSize: number,
  attempts = 3
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchCollectionTypeWithMeta<StrapiArticle[]>('articles', {
        locale,
        sort: ['originalPublishedAt:desc'],
        populate: ['image', 'categories'],
        pagination: { page, pageSize },
        status: 'published',
      });
    } catch {
      if (attempt === attempts) {
        return {
          data: [] as StrapiArticle[],
          pagination: { page, pageSize, pageCount: 0, total: 0 },
        };
      }
      await sleep(300 * attempt);
    }
  }
  // Unreachable — the loop above always returns, but TS needs a fallback.
  return {
    data: [] as StrapiArticle[],
    pagination: { page, pageSize, pageCount: 0, total: 0 },
  };
}

/**
 * WordPress REST API v2 posts-list compatibility shim
 * (https://developer.wordpress.org/rest-api/reference/posts/) — some
 * integrations (the mobile app among them, per rss-wp.ts) were built against
 * the old WP site's `/wp-json/wp/v2/posts` (and its `/en/` counterpart) and
 * expect the same shape and query params (`page`, `per_page`, `_embed`) to
 * keep working unmodified against this site, rather than being rewritten to
 * a Strapi-specific API.
 *
 * Shared by both locale route files (`wp-json/wp/v2/posts.ts` and
 * `en/wp-json/wp/v2/posts.ts`) — only the locale, article path, and API
 * base path differ between them.
 */
export async function buildWpPostsResponse(
  context: APIContext,
  locale: 'da' | 'en',
  articlePath: (slug: string) => string,
  apiBasePath: string
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

  const { data: articles, pagination } = await fetchArticlesWithRetry(
    locale,
    page,
    perPage
  );

  const posts = articles.map((article) => {
    const link = `${site}${articlePath(article.slug)}`;
    const published = new Date(
      article.originalPublishedAt ?? article.publishedAt ?? article.createdAt
    );
    const modified = new Date(
      article.updatedAt ?? article.publishedAt ?? article.createdAt
    );
    const imageUrl = article.image?.url
      ? strapiMediaUrl(article.image.url)
      : null;
    const absoluteImageUrl = imageUrl
      ? imageUrl.startsWith('http')
        ? imageUrl
        : `${site}${imageUrl}`
      : null;

    const post: Record<string, unknown> = {
      id: article.id,
      date: published.toISOString().replace('Z', ''),
      date_gmt: published.toISOString().replace('.000Z', ''),
      guid: { rendered: escapeHtml(link) },
      modified: modified.toISOString().replace('Z', ''),
      modified_gmt: modified.toISOString().replace('.000Z', ''),
      slug: article.slug,
      status: 'publish',
      type: 'post',
      link,
      title: { rendered: decodeHtml(article.title) },
      content: {
        rendered: blocksToHtml(article.content),
        protected: false,
      },
      excerpt: {
        rendered: article.description
          ? `<p>${escapeHtml(decodeHtml(article.description))}</p>\n`
          : '',
        protected: false,
      },
      author: 1,
      featured_media: absoluteImageUrl ? article.id : 0,
      // Non-standard, but always present regardless of `_embed` — the real
      // WP REST API only returns the featured image via `_embed`/a separate
      // `/media/{id}` call, which is easy for a consumer to miss entirely.
      // This is the simplest possible way to guarantee an image URL shows up
      // in the plain JSON without requiring that extra knowledge.
      featured_image_url: absoluteImageUrl,
      categories: [],
      tags: [],
      format: 'standard',
      _links: {
        self: [{ href: `${site}${apiBasePath}/${article.id}` }],
        collection: [{ href: `${site}${apiBasePath}` }],
        about: [
          { href: `${site}${apiBasePath.replace(/\/posts$/, '/types/post')}` },
        ],
      },
      // Always included (not gated behind `_embed`, unlike real WP) for the
      // same reason as featured_image_url above — but this shape matches
      // standard WP `_embed=1` output for clients that do know to look here.
      _embedded: {
        author: [{ id: 1, name: 'Akademisk Boldklub' }],
        'wp:featuredmedia': absoluteImageUrl
          ? [
              {
                id: article.id,
                source_url: absoluteImageUrl,
                media_type: 'image',
                alt_text: decodeHtml(article.title),
                media_details: {
                  width: article.image?.width,
                  height: article.image?.height,
                  sizes: {
                    full: {
                      source_url: absoluteImageUrl,
                      width: article.image?.width,
                      height: article.image?.height,
                    },
                  },
                },
              },
            ]
          : [],
      },
    };

    return post;
  });

  return new Response(JSON.stringify(posts), {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-WP-Total': String(pagination.total),
      'X-WP-TotalPages': String(pagination.pageCount),
    },
  });
}
