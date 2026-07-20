import type { APIRoute } from 'astro';

import { PREVIEW_COOKIE } from '@/lib/preview-context';

export const prerender = false;

function isSafeRelativePath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  cookies.delete(PREVIEW_COOKIE, { path: '/' });
  const target = url.searchParams.get('url') ?? '/';
  return redirect(isSafeRelativePath(target) ? target : '/');
};
