import type { APIContext } from 'astro';

import { buildWpPostResponse } from '@/lib/wp-rest-posts';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpPostResponse(
    context,
    'da',
    (slug) => `/nyheder/${slug}`,
    '/wp-json/wp/v2/posts'
  );
}
