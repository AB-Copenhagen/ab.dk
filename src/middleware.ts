import { defineMiddleware } from 'astro:middleware';

import { isSearchIndexingBlocked } from '@/lib/config/seo';

export const onRequest = defineMiddleware(async (context, next) => {
  // Locale resolution — stored in locals for use in layouts
  const locale = context.url.pathname.startsWith('/en') ? 'en' : 'da';
  context.locals.locale = locale;

  // Descope session validation for auth-gated routes
  const GATED_PATHS = ['/konto/profil', '/en/account/profile'];
  const isGated = GATED_PATHS.some((p) => context.url.pathname.startsWith(p));

  if (isGated) {
    const sessionToken =
      context.cookies.get('DS')?.value ??
      context.request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      const loginUrl = locale === 'en' ? '/en/account' : '/konto';
      return context.redirect(
        `${loginUrl}?redirect=${encodeURIComponent(context.url.pathname)}`
      );
    }

    // TODO(descope): validate sessionToken with @descope/node-sdk
    // const sdk = Descope(import.meta.env.DESCOPE_PROJECT_ID);
    // const { ok, data } = await sdk.validateSession(sessionToken);
    // if (!ok) return context.redirect(loginUrl);
    // context.locals.user = data;
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
