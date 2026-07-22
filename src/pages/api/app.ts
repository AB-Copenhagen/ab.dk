import type { APIRoute } from 'astro';

export const prerender = false;

const APP_STORE_URL = 'https://apps.apple.com/id/app/myab/id6760774439';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=dk.ab.club&hl=en_US&pli=1';

/**
 * Single smart link for the MyAB QR code (see /api/qr/app.png) — one URL that
 * resolves to the right store per device, so the printed/shared code never
 * needs to change. Falls back to the MyAB page itself for desktop scans/clicks,
 * where neither store link applies.
 */
export const GET: APIRoute = ({ request, site }) => {
  const userAgent = request.headers.get('user-agent') ?? '';

  const target = /iPad|iPhone|iPod/.test(userAgent)
    ? APP_STORE_URL
    : /Android/.test(userAgent)
      ? PLAY_STORE_URL
      : new URL('/myab', site).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      // Per-device redirect target — must never be served from a shared cache.
      'Cache-Control': 'no-store',
    },
  });
};
