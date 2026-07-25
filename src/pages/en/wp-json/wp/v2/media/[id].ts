import type { APIContext } from 'astro';

import { buildWpMediaResponse } from '@/lib/wp-rest-media';

export const prerender = false;

export async function GET(context: APIContext) {
  return buildWpMediaResponse(context, 'en', '/en/wp-json/wp/v2/media');
}
