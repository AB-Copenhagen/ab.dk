import { defineMiddleware } from 'astro:middleware';
import descopeSdk from '@descope/node-sdk';

import { isSearchIndexingBlocked } from '@/lib/config/seo';

const descopeProjectId = import.meta.env.DESCOPE_PROJECT_ID;
const descope = descopeProjectId ? descopeSdk({ projectId: descopeProjectId }) : null;

export const onRequest = defineMiddleware(async (context, next) => {
  // Locale resolution — stored in locals for use in layouts
  const locale = context.url.pathname.startsWith('/en') ? 'en' : 'da';
  context.locals.locale = locale;

  // Descope session validation for auth-gated routes
  const GATED_PATHS = ['/konto/profil', '/en/account/profile'];
  const isGated = GATED_PATHS.some((p) => context.url.pathname.startsWith(p));

  if (isGated) {
    const loginUrl = locale === 'en' ? '/en/account' : '/konto';
    // Clear the DS cookie whenever we bounce back to login — the login page only checks
    // cookie *presence* to decide whether to skip straight to the profile page, so a stale
    // or invalid cookie left in place here would otherwise create a redirect loop between
    // the two.
    const redirectToLogin = () => {
      context.cookies.delete('DS', { path: '/' });
      return context.redirect(`${loginUrl}?redirect=${encodeURIComponent(context.url.pathname)}`);
    };

    const sessionToken =
      context.cookies.get('DS')?.value ??
      context.request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken || !descope) {
      return redirectToLogin();
    }

    try {
      const authInfo = await descope.validateSession(sessionToken);
      const claims = authInfo.token;
      context.locals.user = {
        userId: String(claims.sub ?? ''),
        name: typeof claims.name === 'string' ? claims.name : undefined,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        picture: typeof claims.picture === 'string' ? claims.picture : undefined,
      };
    } catch {
      // Invalid or expired session — force re-authentication.
      return redirectToLogin();
    }
  }

  const response = await next();

  if (isSearchIndexingBlocked()) {
    const blocked = new Response(response.body, response);
    blocked.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive, nosnippet'
    );
    return blocked;
  }

  return response;
});
