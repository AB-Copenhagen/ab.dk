import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { i18n } from '@/i18n.config';

// Paths (without locale prefix) that require an active Descope session.
// Full JWT validation happens server-side in the page via session().
// Middleware only checks cookie presence as a fast gate.
const PROTECTED_PATHS = [
  '/konto/profil',
  '/konto/ordrer',
  '/konto/medlemskab',
];

function getLocale(request: NextRequest): string | undefined {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const locales: Readonly<string[]> = i18n.locales;
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  const locale = matchLocale(languages, locales, i18n.defaultLocale);
  return locale;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── i18n redirect ──────────────────────────────────────────────────────────
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    );
  }

  // ── Descope auth guard ─────────────────────────────────────────────────────
  const segments = pathname.split('/');
  const pathWithoutLocale = '/' + segments.slice(2).join('/');

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + '/')
  );

  if (isProtected) {
    // Descope sets cookies prefixed with 'DS' — presence means a session exists.
    const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('DS'));

    if (!hasSession) {
      const locale = segments[1];
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/konto`;
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
