import type { APIContext } from 'astro';

import { buildWpTagResponse } from '@/lib/wp-rest-tags';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpTagResponse(
    context,
    'en',
    '/en/wp-json/wp/v2/tags',
    '/en/news'
  );
}
