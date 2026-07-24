import type { APIContext } from 'astro';

import { buildWpTagsResponse } from '@/lib/wp-rest-tags';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpTagsResponse(
    context,
    'da',
    '/wp-json/wp/v2/tags',
    '/nyheder'
  );
}
