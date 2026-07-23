/**
 * Custom route for the match-picker admin field — not part of the core
 * match-content CRUD router. Gated to logged-in admin users only (not the
 * public content API): `auth: false` disables the default content-API
 * token/permission check, replaced by the admin-session policy below.
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
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
