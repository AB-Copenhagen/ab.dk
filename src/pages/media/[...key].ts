import type { APIRoute } from 'astro';
import sharp from 'sharp';

import { createVariantCache, resolveRequestedWidth } from '@/lib/image-proxy';

export const prerender = false;

// Fixed upstream host for Strapi Cloud's media CDN — never taken from the
// request, so this route can't be turned into an open proxy for other URLs.
const STRAPI_MEDIA_HOST =
  import.meta.env.STRAPI_MEDIA_HOST ||
  'supportive-miracle-581511a57f.media.strapiapp.com';

// Same bounded variant cache as api/media/[...key].ts — this endpoint is
// public and unauthenticated, so without it every request for a given
// object+size+format would re-fetch from the CDN and re-run sharp.
const MAX_CACHE_ENTRIES = 80;
const variantCache = createVariantCache(MAX_CACHE_ENTRIES);

export const GET: APIRoute = async ({ params, request, url }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const pathParts = key.split('/');

  // Strapi Cloud media assets are immutable (filenames are content-hashed) —
  // cache aggressively.
  const cacheControl = 'public, max-age=31536000, immutable';
  const isConvertible = /\.(png|jpe?g)$/i.test(pathParts[pathParts.length - 1]);
  const acceptsWebp =
    request.headers.get('Accept')?.includes('image/webp') ?? false;
  const width = isConvertible
    ? resolveRequestedWidth(url.searchParams.get('w'))
    : null;
  const outputWebp = isConvertible && acceptsWebp;
  const needsProcessing = isConvertible && (width !== null || outputWebp);
  const variantKey = `${key}:${width ?? 'orig'}:${outputWebp ? 'webp' : 'native'}`;

  if (needsProcessing) {
    const cached = variantCache.get(variantKey);
    if (cached) {
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
    const upstream = await fetch(
      `https://${STRAPI_MEDIA_HOST}/${pathParts.join('/')}`
    );
    if (!upstream.ok || !upstream.body) {
      return new Response('Not found', { status: 404 });
    }

    const contentType = upstream.headers.get('Content-Type');

    if (needsProcessing) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      let pipeline = sharp(bytes);
      if (width)
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      const outBuffer = outputWebp
        ? await pipeline.webp({ quality: 85 }).toBuffer()
        : await pipeline.toBuffer();
      const outContentType = outputWebp
        ? 'image/webp'
        : (contentType ?? 'application/octet-stream');
      const etag = `"${key}-${width ?? 'orig'}-${outputWebp ? 'webp' : 'native'}"`;

      variantCache.set(variantKey, {
        body: outBuffer,
        contentType: outContentType,
        etag,
      });

      return new Response(new Uint8Array(outBuffer), {
        status: 200,
        headers: {
          'Content-Type': outContentType,
          'Content-Length': String(outBuffer.byteLength),
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': '*',
          ETag: etag,
          Vary: 'Accept',
        },
      });
    }

    const headers: Record<string, string> = {
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      Vary: 'Accept',
    };
    if (contentType) headers['Content-Type'] = contentType;
    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
