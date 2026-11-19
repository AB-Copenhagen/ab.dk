import type { APIRoute } from 'astro';

export const prerender = false;

// PostHog's capture/decide/flags endpoints (/e/, /decide/, /flags/, /s/, /i/, /batch/ —
// all extensionless). Static SDK assets (/ingest/static/*.js) never reach this route at
// all — vercel.json's /ingest/static/:path* rewrite proxies those directly at Vercel's
// edge, before any request is routed to this app. A matching rewrite for everything else
// (/ingest/:path* -> us.i.posthog.com) was tried first and silently never fired in
// production — Vercel routed those requests into this app instead, which 404'd, so no
// event ever reached PostHog. Proxying from inside the app sidesteps that rewrite
// entirely instead of relying on it.
const POSTHOG_INGEST_HOST = 'https://us.i.posthog.com';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'host',
]);

function withoutHopByHopHeaders(headers: Headers): Headers {
  const result = new Headers();
  for (const [key, value] of headers) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) result.set(key, value);
  }
  return result;
}

export const ALL: APIRoute = async ({ request, params, url }) => {
  const path = params.path ?? '';
  const target = `${POSTHOG_INGEST_HOST}/${path}${url.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstream = await fetch(target, {
    method: request.method,
    headers: withoutHopByHopHeaders(request.headers),
    body: hasBody ? request.body : undefined,
    // Required by undici when streaming a request body through fetch().
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: withoutHopByHopHeaders(upstream.headers),
  });
};
