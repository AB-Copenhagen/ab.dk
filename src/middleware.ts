import type { APIContext, MiddlewareNext } from 'astro';
import { defineMiddleware } from 'astro:middleware';

import { isSearchIndexingBlocked } from '@/lib/config/seo';
import { descope } from '@/lib/descope-server';
import { type Locale, switchLocalePath } from '@/lib/i18n';
import { PREVIEW_COOKIE, runWithPreview } from '@/lib/preview-context';

const LOCALE_COOKIE = 'locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Crawlers must always see the canonical content at the URL they request, never
// bounced based on Accept-Language — otherwise indexing ends up reflecting the
// bot's language instead of the page's.
const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|pinterestbot|ia_archiver|bingpreview/i;

// Machine-readable endpoints (RSS, sitemap, robots) — these have no locale
// cookie/redirect semantics of their own, but a browser opening one directly
// still sends `Accept: text/html`, so they'd otherwise be caught by the
// text/html check below and get 302'd to a locale-switched URL (e.g. bare
// /feed → /en/feed) that has nothing to do with the visitor's actual intent.
const NON_LOCALE_ROUTE_PATTERN =
  /^\/(feed|en\/feed|rss\/[^/]+|sitemap\.xml|robots\.txt)$/;

/**
 * True if this request was triggered by navigating from another page on this
 * site (an in-site link, e.g. LangSwitch), as opposed to a fresh top-level
 * visit (typed URL, bookmark, or an external link) — needed to tell "the user
 * just clicked to Danish, respect it" apart from "the user landed on the bare
 * (Danish-by-default) URL again and we should honor their stored preference."
 */
function isSameSiteNavigation(context: APIContext): boolean {
  const secFetchSite = context.request.headers.get('sec-fetch-site');
  if (secFetchSite)
    return secFetchSite === 'same-origin' || secFetchSite === 'same-site';

  // Older/uncommon clients that skip Sec-Fetch-Site — fall back to Referer.
  const referer = context.request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).host === context.url.host;
  } catch {
    return false;
  }
}

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
  // Prerendered pages have no live request/cookies to check — and touching
  // context.cookies here would itself access Astro.request.headers, which Astro
  // warns about on prerendered routes.
  const isPreview =
    !context.isPrerendered &&
    context.cookies.get(PREVIEW_COOKIE)?.value === '1';

  return runWithPreview(isPreview, () => handleRequest(context, next));
});

async function handleRequest(context: APIContext, next: MiddlewareNext) {
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
    !NON_LOCALE_ROUTE_PATTERN.test(context.url.pathname) &&
    (context.request.headers.get('accept') ?? '').includes('text/html');
  const isBot =
    isPageRequest &&
    BOT_USER_AGENT_PATTERN.test(
      context.request.headers.get('user-agent') ?? ''
    );

  if (isPageRequest && !isBot) {
    const cookieLocale = context.cookies.get(LOCALE_COOKIE)?.value;

    if (!cookieLocale) {
      // First visit ever, no stored preference — auto-detect from Accept-Language.
      if (locale === 'da') {
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
    } else if (cookieLocale !== locale && !isSameSiteNavigation(context)) {
      // Returning visitor landing fresh (bookmark, typed URL, external link) on
      // a page whose implied locale doesn't match their stored preference —
      // honor the stored preference instead of silently reverting it. Danish
      // has no URL prefix, so every unprefixed page looks identical to a bare
      // first-visit; without this, re-visiting the bare domain after choosing
      // English would fall through to the sync below and silently overwrite
      // the cookie back to 'da'. In-site navigations (LangSwitch, internal
      // links) are excluded so an explicit manual switch always wins.
      const targetPath = switchLocalePath(
        context.url.pathname,
        cookieLocale as Locale
      );
      return context.redirect(`${targetPath}${context.url.search}`, 302);
    }

    // Keeps the cookie in sync with whatever locale is actually being served — this
    // is what makes a manual switch via LangSwitch stick, overriding whatever the
    // stored preference previously was.
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
}
