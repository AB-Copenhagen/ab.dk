import type { APIContext } from 'astro';

import { buildWpPostsResponse } from '@/lib/wp-rest-posts';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpPostsResponse(
    context,
    'en',
    (slug) => `/en/news/${slug}`,
    '/en/wp-json/wp/v2/posts'
  );
}
