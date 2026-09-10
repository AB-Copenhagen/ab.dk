import type { APIContext } from 'astro';
import sharp from 'sharp';

import crestDataUri from '../../../../public/images/ab-crest-white.svg?inline';
import { fetchBytes, fetchWasabiBytes } from '@/lib/og-image';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;

// Article images live in one of two places depending on which provider handled
// the upload (Wasabi via our own migration/catchup scripts, or Strapi Cloud's
// own storage for anything uploaded through the admin panel directly) — this
// endpoint takes `image` from the client, so both shapes must be validated,
// not just accepted as an open SSRF proxy.
// Wasabi-proxy-shaped path (fetched directly from Wasabi below, not through
// the proxy — same as player.png.ts).
const SAFE_MEDIA_PROXY_PATH =
  /^\/api\/media\/uploads\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i;
// strapiMediaUrl() (src/lib/strapi/client.ts) proxies Strapi Cloud CDN images
// through our own /media/{key} route rather than returning the raw
// strapiapp.com URL — so that's the shape callers actually pass here, not the
// external host. Fetched via the same pinned host as /media/[...key].ts,
// never taken from the request, so this can't become an open proxy.
const SAFE_STRAPI_PROXY_PATH =
  /^\/media\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i;
const STRAPI_MEDIA_HOST =
  import.meta.env.STRAPI_MEDIA_HOST ||
  'supportive-miracle-581511a57f.media.strapiapp.com';

export async function GET({ url }: APIContext) {
  const imagePath = url.searchParams.get('image');

  if (!imagePath) {
    return new Response('Invalid image path', { status: 400 });
  }

  try {
    let imageBytes: Uint8Array;
    if (SAFE_MEDIA_PROXY_PATH.test(imagePath)) {
      // imagePath is /api/media/{key} — strip the proxy prefix and fetch the
      // same Wasabi object directly, rather than self-fetching over HTTP.
      const wasabiKey = imagePath.replace(/^\/api\/media\//, '');
      imageBytes = await fetchWasabiBytes(wasabiKey);
    } else if (SAFE_STRAPI_PROXY_PATH.test(imagePath)) {
      // imagePath is /media/{key} — fetch the same Strapi Cloud object
      // directly from the pinned host, rather than self-fetching over HTTP.
      const strapiKey = imagePath.replace(/^\/media\//, '');
      imageBytes = await fetchBytes(`https://${STRAPI_MEDIA_HOST}/${strapiKey}`);
    } else {
      return new Response('Invalid image path', { status: 400 });
    }

    const coverImage = await sharp(imageBytes)
      .resize(CANVAS_W, CANVAS_H, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    const crestSize = 100;
    const crestX = Math.round((CANVAS_W - crestSize) / 2);
    const crestY = CANVAS_H - crestSize - 40;

    const overlaySvg = `
      <svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#002A1A" stop-opacity="0"/>
            <stop offset="55%" stop-color="#002A1A" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#002A1A" stop-opacity="0.92"/>
          </linearGradient>
        </defs>
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#fade)"/>
        <image href="${crestDataUri}" x="${crestX}" y="${crestY}" width="${crestSize}" height="${crestSize}"/>
      </svg>
    `;

    const png = await sharp(coverImage)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Failed to generate image', { status: 502 });
  }
}
