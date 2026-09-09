import type { APIContext } from 'astro';

import { buildWpCategoryResponse } from '@/lib/wp-rest-categories';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpCategoryResponse(
    context,
    'en',
    '/en/wp-json/wp/v2/categories',
    '/en/news'
  );
}
