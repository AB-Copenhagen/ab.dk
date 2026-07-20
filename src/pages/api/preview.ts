import type { APIRoute } from 'astro';

import { PREVIEW_COOKIE } from '@/lib/preview-context';

export const prerender = false;

const PREVIEW_SECRET = import.meta.env.PREVIEW_SECRET as string | undefined;

/** Only allow redirecting back into this site — blocks the `url` param being used as an open redirect. */
function isSafeRelativePath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const secret = url.searchParams.get('secret');
  const target = url.searchParams.get('url') ?? '/';
  const status = url.searchParams.get('status');

  if (!PREVIEW_SECRET || secret !== PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 });
  }

  if (!isSafeRelativePath(target)) {
    return new Response('Invalid url', { status: 400 });
  }

  if (status === 'published') {
    cookies.delete(PREVIEW_COOKIE, { path: '/' });
  } else {
    // sameSite: 'none' is required here — this route is loaded inside an iframe
    // embedded by the Strapi admin (a different site), so the cookie must be sent
    // on subsequent navigations within that cross-site frame.
    cookies.set(PREVIEW_COOKIE, '1', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  }

  return redirect(target);
};
