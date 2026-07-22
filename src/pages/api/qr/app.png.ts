import type { APIRoute } from 'astro';
import QRCode from 'qrcode';

// Static content (always encodes the same URL) — safe to prerender once at
// build time rather than regenerating it on every request.
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const appLinkUrl = new URL('/api/app', site).toString();

  const png = await QRCode.toBuffer(appLinkUrl, {
    type: 'png',
    width: 480,
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFFFF' },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
