import type { APIRoute } from 'astro';

import { PREVIEW_COOKIE } from '@/lib/preview-context';
import { isSafeRelativePath } from '@/lib/utils';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  cookies.delete(PREVIEW_COOKIE, { path: '/' });
  const target = url.searchParams.get('url') ?? '/';
  return redirect(isSafeRelativePath(target) ? target : '/');
};
