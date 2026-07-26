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

  // RSS readers poll on their own schedule (typically 15-60 min), so this
  // can tolerate a longer cache window than the 5-minute default in exchange
  // for hitting Strapi's heaviest query far less often.
  const articles = await fetchCollectionType<StrapiArticle[]>(
    'articles',
    {
      locale: 'en',
      sort: ['originalPublishedAt:desc'],
      populate: {
        image: { fields: ['url'] },
        categories: { fields: ['name'] },
      },
      pagination: { pageSize: 20 },
    },
    { ttl: 900 }
  ).catch(() => [] as StrapiArticle[]);

  const body = buildWpRssFeed({
    title: 'Akademisk Boldklub – AB 1889',
    link: `${site}/en/news`,
    description: 'Official Website of 9 Times Danish Champions',
    feedUrl: `${site}/en/feed`,
    language: 'en-US',
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
        link: `${site}/en/news/${article.slug}`,
        creator: 'Akademisk Boldklub',
        pubDate: new Date(
          article.originalPublishedAt ??
            article.publishedAt ??
            article.createdAt
        ),
        categories: categories.length ? categories : ['News'],
        excerpt: decodeHtml(article.description ?? ''),
        contentHtml: imgTag + blocksToHtml(article.content),
      };
    }),
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=900, stale-while-revalidate=1800',
    },
  });
}
