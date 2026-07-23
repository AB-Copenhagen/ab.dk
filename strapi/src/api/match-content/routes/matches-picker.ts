/**
 * Custom route for the match-picker admin field — not part of the core
 * match-content CRUD router.
 *
 * Strapi forces every route declared under an `api/*` folder to
 * `type: 'content-api'` regardless of what's set here (see
 * @strapi/core's registerAPIRoutes — `router.type = 'content-api'` is
 * unconditional), so `type: 'admin'` here is a no-op; only actual plugins
 * can register real admin-type routes. That also means an admin-session
 * policy like `admin::isAuthenticatedAdmin` never has anything to check on
 * a route from this folder — confirmed the hard way (401, then 404 once
 * the path assumptions were "corrected" to match a type that was never
 * really applied).
 *
 * The match list is public data anyway (same schedule the SI API serves
 * with no token, same as this site's own /kampe page), so there's nothing
 * to gate — this is just a normal public content-API endpoint.
 */
export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/match-contents/matches',
      handler: 'match-content.matches',
      config: {
        auth: false,
      },
    },
  ],
};
