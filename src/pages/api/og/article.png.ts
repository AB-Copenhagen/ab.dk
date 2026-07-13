import type { APIContext } from 'astro';
import sharp from 'sharp';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;

// Only same-origin Strapi media-proxy paths are allowed — this endpoint fetches
// `image` server-side, so it must not become an open SSRF proxy.
const SAFE_IMAGE_PATH = /^\/api\/media\/uploads\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/i;

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function GET({ url }: APIContext) {
  const imagePath = url.searchParams.get('image');

  if (!imagePath || !SAFE_IMAGE_PATH.test(imagePath)) {
    return new Response('Invalid image path', { status: 400 });
  }

  try {
    const [imageBytes, crestBytes] = await Promise.all([
      fetchBytes(`${url.origin}${imagePath}`),
      fetchBytes(`${url.origin}/images/ab-crest-white.svg`),
    ]);

    const coverImage = await sharp(imageBytes)
      .resize(CANVAS_W, CANVAS_H, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    const crestSize = 100;
    const crestX = Math.round((CANVAS_W - crestSize) / 2);
    const crestY = CANVAS_H - crestSize - 40;
    const crestDataUri = `data:image/svg+xml;base64,${toBase64(crestBytes)}`;

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
      .composite([{ input: new TextEncoder().encode(overlaySvg), top: 0, left: 0 }])
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
