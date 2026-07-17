import type { APIContext } from 'astro';
import sharp from 'sharp';
import { fetchWasabiBytes } from '@/lib/og-image';
import crestDataUri from '../../../../public/images/ab-crest-white.svg?inline';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;

// Only Strapi media-proxy-shaped paths are allowed — this endpoint takes
// `image` from the client, so it must not become an open SSRF proxy. Matched
// against the /api/media/ proxy's URL shape even though the image is fetched
// directly from Wasabi below (not through that proxy), same as player.png.ts.
const SAFE_IMAGE_PATH =
  /^\/api\/media\/uploads\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i;

export async function GET({ url }: APIContext) {
  const imagePath = url.searchParams.get('image');

  if (!imagePath || !SAFE_IMAGE_PATH.test(imagePath)) {
    return new Response('Invalid image path', { status: 400 });
  }

  try {
    // imagePath is /api/media/{key} — strip the proxy prefix and fetch the
    // same Wasabi object directly, rather than self-fetching over HTTP.
    const wasabiKey = imagePath.replace(/^\/api\/media\//, '');
    const imageBytes = await fetchWasabiBytes(wasabiKey);

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
      .composite([
        { input: new TextEncoder().encode(overlaySvg), top: 0, left: 0 },
      ])
      .png()
      .toBuffer();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Failed to generate image', { status: 502 });
  }
}
