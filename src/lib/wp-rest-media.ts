import type { APIContext } from 'astro';

import { strapiMediaUrl } from '@/lib/strapi/client';
import { decodeHtml } from '@/lib/utils';
import { fetchArticleById, wpNotFoundResponse } from '@/lib/wp-rest-posts';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function mimeTypeFor(url: string): string {
  const ext = url.split('.').pop()?.split('?')[0].toLowerCase() ?? '';
  return MIME_TYPES[ext] ?? 'image/jpeg';
}

/**
 * WordPress REST API v2 single-media compatibility shim for
 * `/wp-json/wp/v2/media/{id}` — buildWpPostsResponse's `featured_media` id is
 * always the article's own Strapi id (one image per article, no separate
 * media collection), so looking up "media {id}" is just looking up article
 * {id}'s image.
 */
export async function buildWpMediaResponse(
  context: APIContext,
  locale: 'da' | 'en',
  apiBasePath: string
): Promise<Response> {
  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
  const idParam = context.params.id;
  const id = idParam ? parseInt(idParam, 10) : NaN;
  if (!Number.isInteger(id) || id <= 0) return wpNotFoundResponse();

  const article = await fetchArticleById(locale, id);
  const imageUrl = article?.image?.url
    ? strapiMediaUrl(article.image.url)
    : null;
  if (!article || !imageUrl) return wpNotFoundResponse();

  const absoluteImageUrl = imageUrl.startsWith('http')
    ? imageUrl
    : `${site}${imageUrl}`;
  const published = new Date(
    article.originalPublishedAt ?? article.publishedAt ?? article.createdAt
  );
  const modified = new Date(
    article.updatedAt ?? article.publishedAt ?? article.createdAt
  );
  const mimeType = mimeTypeFor(absoluteImageUrl);
  const title = decodeHtml(article.title);
  const { width, height } = article.image ?? {};

  const media = {
    id: article.id,
    date: published.toISOString().replace('Z', ''),
    date_gmt: published.toISOString().replace('.000Z', ''),
    guid: { rendered: absoluteImageUrl },
    modified: modified.toISOString().replace('Z', ''),
    modified_gmt: modified.toISOString().replace('.000Z', ''),
    slug: `${article.slug}-image`,
    status: 'inherit',
    type: 'attachment',
    link: absoluteImageUrl,
    title: { rendered: title },
    author: 1,
    caption: { rendered: '' },
    description: { rendered: '' },
    alt_text: title,
    media_type: 'image',
    mime_type: mimeType,
    source_url: absoluteImageUrl,
    media_details: {
      width,
      height,
      file: article.slug,
      sizes: {
        full: {
          source_url: absoluteImageUrl,
          width,
          height,
          mime_type: mimeType,
        },
      },
    },
    _links: {
      self: [{ href: `${site}${apiBasePath}/${article.id}` }],
      collection: [{ href: `${site}${apiBasePath}` }],
    },
  };

  return new Response(JSON.stringify(media), {
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  });
}
