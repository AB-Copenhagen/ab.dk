/**
 * Lets Vercel's CDN cache a Strapi-backed SSR response and serve repeat
 * requests for the same URL straight from the edge — without re-invoking the
 * function, and therefore without a live Strapi round trip — for up to
 * `maxAge` seconds, falling back to a stale copy for up to
 * `staleWhileRevalidate` more while a background request refreshes it.
 *
 * `max-age=0` keeps browsers from holding their own copy that can't be
 * invalidated by a Strapi publish; only the CDN layer (`s-maxage`) does.
 *
 * Trade-off: cache hits are served straight from the edge, so this
 * codebase's request-time middleware (locale auto-redirect on a visitor's
 * very first-ever visit) doesn't run for them. Acceptable here — it only
 * affects that one-time redirect, never personalized content, and self-heals
 * as soon as the entry expires.
 */
export function setCdnCacheHeaders(
  headers: Headers,
  {
    maxAge = 60,
    staleWhileRevalidate = 300,
  }: { maxAge?: number; staleWhileRevalidate?: number } = {}
): void {
  headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
}
