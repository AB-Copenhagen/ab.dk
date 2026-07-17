import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const prerender = false;

const BUCKET = import.meta.env.WASABI_BUCKET ?? 'ab-media';
const REGION = import.meta.env.WASABI_REGION ?? 'eu-central-1';
const ENDPOINT = `https://s3.${REGION}.wasabisys.com`;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: import.meta.env.WASABI_ACCESS_KEY_ID ?? '',
    secretAccessKey: import.meta.env.WASABI_SECRET_ACCESS_KEY ?? '',
  },
});

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(cmd);

    // Fonts are immutable — cache for 1 year; other assets 24h.
    const isFont = /\.(woff2?|ttf|otf|eot)$/i.test(key);
    const cacheControl = isFont
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400';

    const isPng = /\.png$/i.test(key);
    const acceptsWebp = request.headers.get('Accept')?.includes('image/webp');

    if (isPng && acceptsWebp && res.Body) {
      const bytes = await (res.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
      const webpBuffer = await sharp(bytes).webp({ quality: 85 }).toBuffer();
      return new Response(webpBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Content-Length': String(webpBuffer.byteLength),
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': '*',
          Vary: 'Accept',
        },
      });
    }

    const headers: Record<string, string> = {
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    };
    if (res.ContentType) headers['Content-Type'] = res.ContentType;
    if (res.ETag) headers['ETag'] = res.ETag;
    if (res.ContentLength)
      headers['Content-Length'] = String(res.ContentLength);

    return new Response(res.Body as ReadableStream, { status: 200, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
