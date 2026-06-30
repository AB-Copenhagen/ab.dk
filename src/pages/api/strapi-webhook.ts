import type { APIRoute } from 'astro';
import { webhook } from '@/lib/strapi-revalidate';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let status = 200;
  let body: unknown = {};
  await webhook(request, {
    status: (code) => { status = code; },
    json: (value) => { body = value; },
  });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
