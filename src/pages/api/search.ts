import type { APIRoute } from 'astro';

import { fetchCollectionType, strapiMediaUrl } from '@/lib/strapi/client';
import { decodeHtml } from '@/lib/utils';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const locale = (url.searchParams.get('locale') ?? 'da') as 'da' | 'en';

  if (q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = await fetchCollectionType<any[]>('articles', {
    locale,
    filters: {
      $or: [{ title: { $containsi: q } }, { description: { $containsi: q } }],
    },
    populate: ['image', 'categories'],
    pagination: { pageSize: 8 },
  }).catch(() => [] as any[]);

  const shaped = results.map((a: any) => ({
    slug: a.slug,
    title: decodeHtml(a.title),
    excerpt: a.description ? decodeHtml(a.description) : '',
    category: a.categories?.[0]?.name ?? null,
    imageUrl: a.image?.url ? strapiMediaUrl(a.image.url) : null,
  }));

  return new Response(JSON.stringify(shaped), {
    headers: { 'Content-Type': 'application/json' },
  });
};
