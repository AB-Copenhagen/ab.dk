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

const CUSTOM_ROUTE = {
  method: 'GET',
  path: '/match-contents/matches',
  handler: 'match-content.matches',
  config: {
    auth: false,
  },
};

export default {
  type: coreRouter.type,
  prefix: coreRouter.prefix,
  // `routes` MUST stay lazy, same as createCoreRouter's own `routes` getter —
  // it reads the content-type registry (`strapi.contentType(uid)`), which
  // isn't populated yet at module-load time. Eagerly spreading
  // `coreRouter.routes` here at the top level broke production boot entirely
  // ("Cannot read properties of undefined (reading 'kind')" from
  // isSingleType, called with an undefined content type) — this getter
  // defers that same access to whenever Strapi actually asks for routes,
  // exactly like the original single-line `createCoreRouter(...)` export did.
  get routes() {
    const coreRoutes =
      typeof coreRouter.routes === 'function'
        ? coreRouter.routes()
        : coreRouter.routes;
    return [CUSTOM_ROUTE, ...coreRoutes];
  },
};
