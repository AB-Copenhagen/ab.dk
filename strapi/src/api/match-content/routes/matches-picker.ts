/**
 * Custom route for the match-picker admin field — not part of the core
 * match-content CRUD router, and not a public content-API endpoint.
 * `type: 'admin'` mounts this with no path prefix (unlike `content-api`,
 * which gets `/api`) and runs it through the admin session middleware, so
 * the `admin::isAuthenticatedAdmin` policy actually has a session to check —
 * that policy only recognizes admin auth on admin-type routes, not
 * content-API ones (confirmed the hard way: on a content-api route it 401s
 * even when called from a logged-in admin session).
 */
export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/match-contents/matches',
      handler: 'match-content.matches',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
