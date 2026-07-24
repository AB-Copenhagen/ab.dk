import type { APIRoute } from 'astro';

import {
  REFRESH_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
  descope,
  sessionCookieOptions,
} from '@/lib/descope-server';

export const prerender = false;

const jsonHeaders = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!descope) {
    return new Response(
      JSON.stringify({ success: false, error: 'Login is not configured' }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }

  const json = await request.json().catch(() => null);
  const sessionToken = json?.sessionToken;
  const refreshToken =
    typeof json?.refreshToken === 'string' ? json.refreshToken : undefined;
  if (typeof sessionToken !== 'string' || !sessionToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing session token' }),
      {
        status: 400,
        headers: jsonHeaders,
      }
    );
  }

  try {
    await descope.validateSession(sessionToken);
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid session' }),
      {
        status: 401,
        headers: jsonHeaders,
      }
    );
  }

  cookies.set('DS', sessionToken, sessionCookieOptions(SESSION_COOKIE_MAX_AGE));
  // Without the refresh token, there's nothing to renew the session with once
  // the short-lived session JWT above expires — the visitor gets bounced back
  // to login on their next visit even though they never explicitly signed out.
  if (refreshToken) {
    cookies.set(
      'DSR',
      refreshToken,
      sessionCookieOptions(REFRESH_COOKIE_MAX_AGE)
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: jsonHeaders,
  });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete('DS', { path: '/' });
  cookies.delete('DSR', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: jsonHeaders,
  });
};
