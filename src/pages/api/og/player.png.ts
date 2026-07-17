import type { APIContext } from 'astro';
import sharp from 'sharp';
import { OG_COLORS, fetchWasabiBytes } from '@/lib/og-image';
import monogramDataUri from '../../../../public/images/logo-behind-player.svg?inline';
import crestDataUri from '../../../../public/images/ab-crest-white.svg?inline';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;

// Only same-origin player photo paths are allowed — this endpoint takes
// `photo` from the client, so it must not become an open SSRF proxy. Matched
// against the /api/media/ proxy's URL shape even though the photo is fetched
// directly from Wasabi below (not through that proxy) — keeps the accepted
// shape identical regardless of which fetch strategy serves it.
const SAFE_PHOTO_PATH = /^\/api\/media\/players\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function GET({ url }: APIContext) {
  const photoPath = url.searchParams.get('photo');

  if (!photoPath || !SAFE_PHOTO_PATH.test(photoPath)) {
    return new Response('Invalid photo path', { status: 400 });
  }

  try {
    // photoPath is /api/media/{key} — strip the proxy prefix and fetch the
    // same Wasabi object directly, rather than self-fetching over HTTP.
    const wasabiKey = photoPath.replace(/^\/api\/media\//, '');
    const photoBuffer = await fetchWasabiBytes(wasabiKey);

    const photoMeta = await sharp(photoBuffer).metadata();
    const photoAspect = (photoMeta.width ?? 1) / (photoMeta.height ?? 1);
    const photoHeight = CANVAS_H;
    const photoWidth = Math.round(photoHeight * photoAspect);
    const photoX = Math.round((CANVAS_W - photoWidth) / 2);

    const monogramWidth = 360;
    const monogramHeight = Math.round(monogramWidth * (422 / 411));
    const monogramX = Math.round(0.16 * CANVAS_W - monogramWidth / 2);
    const monogramY = Math.round(CANVAS_H / 2 - monogramHeight / 2);

    const crestSize = 340;
    const crestX = Math.round(CANVAS_W * 0.99 - crestSize);
    const crestY = Math.round(CANVAS_H / 2 - crestSize / 2);

    const photoDataUri = `data:image/png;base64,${toBase64(photoBuffer)}`;

    const svg = `
      <svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#002A1A"/>
            <stop offset="42%" stop-color="${OG_COLORS.green}"/>
            <stop offset="100%" stop-color="#00C018"/>
          </linearGradient>
        </defs>
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>
        <image href="${monogramDataUri}" x="${monogramX}" y="${monogramY}" width="${monogramWidth}" height="${monogramHeight}"/>
        <image href="${crestDataUri}" x="${crestX}" y="${crestY}" width="${crestSize}" height="${crestSize}" opacity="0.45"/>
        <image href="${photoDataUri}" x="${photoX}" y="0" width="${photoWidth}" height="${photoHeight}"/>
      </svg>
    `;

    const png = await sharp(new TextEncoder().encode(svg)).png().toBuffer();

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
