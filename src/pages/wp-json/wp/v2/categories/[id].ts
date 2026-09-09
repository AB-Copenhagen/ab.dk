import type { APIContext } from 'astro';

import { buildWpCategoryResponse } from '@/lib/wp-rest-categories';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpCategoryResponse(
    context,
    'da',
    '/wp-json/wp/v2/categories',
    '/nyheder'
  );
}
