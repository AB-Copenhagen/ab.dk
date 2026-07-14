import type { APIRoute } from 'astro';

import { descope } from '@/lib/descope-server';

export const prerender = false;

const jsonHeaders = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!descope) {
    return new Response(JSON.stringify({ success: false, error: 'Login is not configured' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const json = await request.json().catch(() => null);
  const sessionToken = json?.sessionToken;
  if (typeof sessionToken !== 'string' || !sessionToken) {
    return new Response(JSON.stringify({ success: false, error: 'Missing session token' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    await descope.validateSession(sessionToken);
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid session' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  cookies.set('DS', sessionToken, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete('DS', { path: '/' });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
};
