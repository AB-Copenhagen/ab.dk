import type { APIRoute } from 'astro';

import { isSearchIndexingBlocked } from '@/lib/config/seo';

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('/sitemap.xml', site).href;
  const body = isSearchIndexingBlocked()
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
