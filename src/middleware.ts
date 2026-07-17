import { defineMiddleware } from 'astro:middleware';

import { isSearchIndexingBlocked } from '@/lib/config/seo';
import { descope } from '@/lib/descope-server';
import { switchLocalePath } from '@/lib/i18n';

const LOCALE_COOKIE = 'locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Crawlers must always see the canonical content at the URL they request, never
// bounced based on Accept-Language — otherwise indexing ends up reflecting the
// bot's language instead of the page's.
const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|pinterestbot|ia_archiver|bingpreview/i;

/** True if Danish is the browser's highest-priority language, or the header gives no usable signal. */
function prefersDanish(acceptLanguage: string): boolean {
  const tags = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';q=');
      return {
        tag: tag?.trim().toLowerCase() ?? '',
        q: qPart ? parseFloat(qPart) : 1,
      };
    })
    .filter((t) => t.tag && t.tag !== '*')
    .sort((a, b) => b.q - a.q);

  return tags.length === 0 || tags[0].tag.startsWith('da');
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Locale resolution — stored in locals for use in layouts
  const locale = context.url.pathname.startsWith('/en') ? 'en' : 'da';
  context.locals.locale = locale;

  // First-visit language auto-detection. Scoped to actual page navigations — real
  // browsers send `Accept: text/html…`, which feeds/sitemap/API routes don't — and
  // skipped for crawlers (see BOT_USER_AGENT_PATTERN above) and prerendered routes
  // (request headers aren't meaningful at build time, and static pages can't redirect).
  const isPageRequest =
    !context.isPrerendered &&
    !context.url.pathname.startsWith('/api/') &&
    (context.request.headers.get('accept') ?? '').includes('text/html');
  const isBot =
    isPageRequest &&
    BOT_USER_AGENT_PATTERN.test(
      context.request.headers.get('user-agent') ?? ''
    );

  if (isPageRequest && !isBot) {
    const hasLocaleCookie = context.cookies.has(LOCALE_COOKIE);

    if (!hasLocaleCookie && locale === 'da') {
      const acceptLanguage =
        context.request.headers.get('accept-language') ?? '';
      if (!prefersDanish(acceptLanguage)) {
        context.cookies.set(LOCALE_COOKIE, 'en', {
          path: '/',
          maxAge: ONE_YEAR_SECONDS,
        });
        const targetPath = switchLocalePath(context.url.pathname, 'en');
        return context.redirect(`${targetPath}${context.url.search}`, 302);
      }
    }

    // Keeps the cookie in sync with whatever locale is actually being served — this
    // is what makes a manual switch via LangSwitch stick on the next cookie-less
    // check above, overriding whatever auto-detect previously decided.
    context.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    });
  }

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
      return context.redirect(
        `${loginUrl}?redirect=${encodeURIComponent(context.url.pathname)}`
      );
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
        picture:
          typeof claims.picture === 'string' ? claims.picture : undefined,
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
