import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { fetchCollectionType } from '@/lib/strapi/client';

interface StrapiArticle {
  title: string;
  description?: string;
  slug: string;
  publishedAt?: string;
  createdAt: string;
}

export async function GET(context: APIContext) {
  const site = context.site?.toString() ?? context.url.origin;

  const articles = await fetchCollectionType<StrapiArticle[]>('articles', {
    locale: 'da',
    sort: ['publishedAt:desc'],
    pagination: { pageSize: 50 },
    status: 'published',
  }).catch(() => [] as StrapiArticle[]);

  return rss({
    title: 'AB 1889 · Nyheder',
    description: 'Seneste nyheder og artikler fra Akademisk Boldklub',
    site,
    items: articles.map((article) => ({
      title: article.title,
      description: article.description ?? '',
      pubDate: new Date(article.publishedAt ?? article.createdAt),
      link: `/blog/${article.slug}`,
    })),
    customData: '<language>da-DK</language>',
  });
}
