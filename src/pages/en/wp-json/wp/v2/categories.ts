import type { APIContext } from 'astro';

import { buildWpCategoriesResponse } from '@/lib/wp-rest-categories';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpCategoriesResponse(
    context,
    'en',
    '/en/wp-json/wp/v2/categories',
    '/en/news'
  );
}
