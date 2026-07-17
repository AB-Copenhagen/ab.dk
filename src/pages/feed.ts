import type { APIContext } from 'astro';

import { blocksToHtml } from '@/lib/blocks-to-html';
import { buildWpRssFeed } from '@/lib/rss-wp';
import { fetchCollectionType, strapiMediaUrl } from '@/lib/strapi/client';
import { decodeHtml } from '@/lib/utils';

export const prerender = false;

interface StrapiArticle {
  title: string;
  description?: string;
  slug: string;
  content?: unknown;
  categories?: { name: string }[];
  image?: { url: string };
  originalPublishedAt?: string;
  publishedAt?: string;
  createdAt: string;
}

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );

  const articles = await fetchCollectionType<StrapiArticle[]>('articles', {
    locale: 'da',
    sort: ['originalPublishedAt:desc'],
    populate: ['image', 'categories'],
    pagination: { pageSize: 50 },
    status: 'published',
  }).catch(() => [] as StrapiArticle[]);

  const body = buildWpRssFeed({
    title: 'Akademisk Boldklub – AB 1889',
    link: `${site}/nyheder`,
    description: 'Official Website of 9 Times Danish Champions',
    feedUrl: `${site}/feed`,
    language: 'da-DK',
    items: articles.map((article) => {
      const mediaUrl = article.image?.url
        ? strapiMediaUrl(article.image.url)
        : '';
      const absoluteMediaUrl = mediaUrl.startsWith('http')
        ? mediaUrl
        : `${site}${mediaUrl}`;
      const imgTag = mediaUrl
        ? `<p><img src="${absoluteMediaUrl}" alt="${decodeHtml(article.title)}" /></p>`
        : '';
      const categories = article.categories?.map((c) => c.name) ?? [];
      return {
        title: decodeHtml(article.title),
        link: `${site}/nyheder/${article.slug}`,
        creator: 'Akademisk Boldklub',
        pubDate: new Date(
          article.originalPublishedAt ??
            article.publishedAt ??
            article.createdAt
        ),
        categories: categories.length ? categories : ['Nyheder'],
        excerpt: decodeHtml(article.description ?? ''),
        contentHtml: imgTag + blocksToHtml(article.content),
      };
    }),
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=UTF-8' },
  });
}
