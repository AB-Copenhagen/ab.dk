/**
 * match-content router
 *
 * The match-picker's custom `/match-contents/matches` route has to be
 * declared BEFORE the core router's routes, in this same array — Koa's
 * router matches in registration order, and the core `findOne` route
 * (`/match-contents/:id`) matches literally any single path segment,
 * including the literal string "matches". Splitting the custom route into
 * its own file relied on cross-file load order (readdir, effectively
 * alphabetical) to win that race, and it silently lost: every request to
 * the custom route was actually being served by findOne with id="matches",
 * producing a confusing 401 that had nothing to do with auth config.
 */
import { factories } from '@strapi/strapi';

const coreRouter = factories.createCoreRouter(
  'api::match-content.match-content'
);

// createCoreRouter's `.routes` is typed as `Route[] | (() => Route[])` even
// though this factory always returns a plain array at runtime — handle both
// shapes rather than assuming.
const coreRoutes =
  typeof coreRouter.routes === 'function'
    ? coreRouter.routes()
    : coreRouter.routes;

export default {
  type: coreRouter.type,
  prefix: coreRouter.prefix,
  routes: [
    {
      method: 'GET',
      path: '/match-contents/matches',
      handler: 'match-content.matches',
      config: {
        auth: false,
      },
    },
    ...coreRoutes,
  ],
};
