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

// Mirrors astro.config's Vercel imagesConfig.sizes — a `?w=` request snaps to one of
// these instead of an arbitrary value, so the transcode cache below has a bounded key
// space per object (an attacker varying `w` on every request can't force an unbounded
// number of distinct resize+encode operations).
const ALLOWED_WIDTHS = [
  320, 400, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

function resolveRequestedWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return ALLOWED_WIDTHS.find((w) => w >= n) ?? ALLOWED_WIDTHS.at(-1)!;
}

// Above this source size, skip resize/transcode entirely and proxy the original bytes —
// bounds worst-case CPU/memory per request regardless of what a caller asks for.
const MAX_TRANSCODE_SOURCE_BYTES = 15 * 1024 * 1024;

// Small in-memory cache for resized/transcoded variants, reused across requests handled
// by the same warm instance (Vercel Fluid Compute keeps these around between invocations).
// Without this, every request for a given object+size+format re-downloads from Wasabi and
// re-runs sharp — cheap to trigger repeatedly since this endpoint is public and
// unauthenticated, and a cache-busting query string defeats the CDN's own HTTP caching of
// the response. Keyed on the object key/width/format, not the full request URL, so it
// can't be bypassed that way. Bounded entry count keeps memory use predictable.
interface CachedVariant {
  body: Uint8Array;
  contentType: string;
  etag: string;
}
const MAX_CACHE_ENTRIES = 80;
const variantCache = new Map<string, CachedVariant>();

function cacheGet(key: string): CachedVariant | undefined {
  return variantCache.get(key);
}

function cacheSet(key: string, value: CachedVariant): void {
  if (variantCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = variantCache.keys().next().value;
    if (oldestKey !== undefined) variantCache.delete(oldestKey);
  }
  variantCache.set(key, value);
}

function notModified(etag: string, cacheControl: string): Response {
  return new Response(null, {
    status: 304,
    headers: { ETag: etag, 'Cache-Control': cacheControl },
  });
}

export const GET: APIRoute = async ({ params, request, url }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  // Fonts are immutable — cache for 1 year; other assets 24h.
  const isFont = /\.(woff2?|ttf|otf|eot)$/i.test(key);
  const cacheControl = isFont
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=86400';

  const isConvertible = /\.(png|jpe?g)$/i.test(key);
  const acceptsWebp =
    request.headers.get('Accept')?.includes('image/webp') ?? false;
  const width = isConvertible
    ? resolveRequestedWidth(url.searchParams.get('w'))
    : null;
  const outputWebp = isConvertible && acceptsWebp;
  const needsProcessing = isConvertible && (width !== null || outputWebp);
  const variantKey = `${key}:${width ?? 'orig'}:${outputWebp ? 'webp' : 'native'}`;
  const ifNoneMatch = request.headers.get('if-none-match');

  if (needsProcessing) {
    const cached = cacheGet(variantKey);
    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return notModified(cached.etag, cacheControl);
      }
      return new Response(new Uint8Array(cached.body), {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Content-Length': String(cached.body.byteLength),
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': '*',
          ETag: cached.etag,
          Vary: 'Accept',
        },
      });
    }
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(cmd);
    const sourceEtag = res.ETag ?? undefined;

    const tooLargeToProcess =
      typeof res.ContentLength === 'number' &&
      res.ContentLength > MAX_TRANSCODE_SOURCE_BYTES;

    if (needsProcessing && !tooLargeToProcess && res.Body) {
      const bytes = await (
        res.Body as { transformToByteArray(): Promise<Uint8Array> }
      ).transformToByteArray();

      let pipeline = sharp(bytes);
      if (width)
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      const outBuffer = outputWebp
        ? await pipeline.webp({ quality: 85 }).toBuffer()
        : await pipeline.toBuffer();
      const contentType = outputWebp
        ? 'image/webp'
        : (res.ContentType ?? 'application/octet-stream');
      const etagSeed = (sourceEtag ?? key).replace(/"/g, '');
      const etag = `"${etagSeed}-${width ?? 'orig'}-${outputWebp ? 'webp' : 'native'}"`;

      cacheSet(variantKey, { body: outBuffer, contentType, etag });

      if (ifNoneMatch && ifNoneMatch === etag) {
        return notModified(etag, cacheControl);
      }

      return new Response(new Uint8Array(outBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(outBuffer.byteLength),
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': '*',
          ETag: etag,
          Vary: 'Accept',
        },
      });
    }

    // Pass-through: non-image assets, oversized images, or no resize/format change requested.
    if (sourceEtag && ifNoneMatch && ifNoneMatch === sourceEtag) {
      return notModified(sourceEtag, cacheControl);
    }

    const headers: Record<string, string> = {
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    };
    if (res.ContentType) headers['Content-Type'] = res.ContentType;
    if (sourceEtag) headers['ETag'] = sourceEtag;
    if (res.ContentLength)
      headers['Content-Length'] = String(res.ContentLength);

    return new Response(res.Body as ReadableStream, { status: 200, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
