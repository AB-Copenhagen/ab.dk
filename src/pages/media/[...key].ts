import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const prerender = false;

// Fixed upstream host for Strapi Cloud's media CDN — never taken from the
// request, so this route can't be turned into an open proxy for other URLs.
const STRAPI_MEDIA_HOST =
  import.meta.env.STRAPI_MEDIA_HOST ||
  'supportive-miracle-581511a57f.media.strapiapp.com';

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const pathParts = key.split('/');

  try {
    const upstream = await fetch(
      `https://${STRAPI_MEDIA_HOST}/${pathParts.join('/')}`
    );
    if (!upstream.ok || !upstream.body) {
      return new Response('Not found', { status: 404 });
    }

    // Strapi Cloud media assets are immutable (filenames are content-hashed) —
    // cache aggressively.
    const cacheControl = 'public, max-age=31536000, immutable';
    const contentType = upstream.headers.get('Content-Type');

    const isConvertible = /\.(png|jpe?g)$/i.test(
      pathParts[pathParts.length - 1]
    );
    const acceptsWebp = request.headers.get('Accept')?.includes('image/webp');

    if (isConvertible && acceptsWebp) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      const webpBuffer = await sharp(bytes).webp({ quality: 85 }).toBuffer();
      return new Response(new Uint8Array(webpBuffer), {
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
    if (contentType) headers['Content-Type'] = contentType;
    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
