import type { APIRoute } from 'astro';

import { isSearchIndexingBlocked } from '@/lib/config/seo';

export const prerender = false;

export const GET: APIRoute = () => {
  const body = isSearchIndexingBlocked()
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n';

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
