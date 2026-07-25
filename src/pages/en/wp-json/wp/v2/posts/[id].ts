import type { APIContext } from 'astro';

import { buildWpPostResponse } from '@/lib/wp-rest-posts';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpPostResponse(
    context,
    'en',
    (slug) => `/en/news/${slug}`,
    '/en/wp-json/wp/v2/posts'
  );
}
