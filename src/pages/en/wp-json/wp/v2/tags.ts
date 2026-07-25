import type { APIContext } from 'astro';

import { buildWpTagsResponse } from '@/lib/wp-rest-tags';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpTagsResponse(
    context,
    'en',
    '/en/wp-json/wp/v2/tags',
    '/en/news'
  );
}
