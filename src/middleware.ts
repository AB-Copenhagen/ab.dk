import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Locale resolution — stored in locals for use in layouts
  const locale = context.url.pathname.startsWith('/en') ? 'en' : 'da';
  context.locals.locale = locale;

  // Descope session validation for auth-gated routes
  const GATED_PATHS = ['/konto/profil', '/en/konto/profil'];
  const isGated = GATED_PATHS.some((p) => context.url.pathname.startsWith(p));

  if (isGated) {
    const sessionToken =
      context.cookies.get('DS')?.value ??
      context.request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      const loginUrl = locale === 'en' ? '/en/konto' : '/konto';
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

  return next();
});
