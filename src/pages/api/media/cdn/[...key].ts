import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const prerender = false;

// Only ever proxy Strapi Cloud's own media CDN — the key encodes the upstream
// host, so without this check the route would be an open proxy for any URL.
const ALLOWED_HOST_RE = /^[a-z0-9-]+\.media\.strapiapp\.com$/i;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const [host, ...pathParts] = key.split('/');
  if (!ALLOWED_HOST_RE.test(host) || pathParts.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const upstream = await fetch(`https://${host}/${pathParts.join('/')}`);
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
