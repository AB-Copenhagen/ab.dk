import type { APIRoute } from 'astro';
import QRCode from 'qrcode';

// Static content (always encodes the same URL) — safe to prerender once at
// build time rather than regenerating it on every request.
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const appLinkUrl = new URL('/api/app', site).toString();

  const svg = await QRCode.toString(appLinkUrl, {
    type: 'svg',
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFFFF' },
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
