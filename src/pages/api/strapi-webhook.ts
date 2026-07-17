import type { WebhookRequest } from '@datum-cloud/strapi-revalidate';
import type { APIRoute } from 'astro';

import { webhook } from '@/lib/strapi-revalidate';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let status = 200;
  let body: unknown = {};
  // Cast needed because Fetch API Headers lacks a string index signature,
  // but the handler only ever calls headers.get() which exists on both shapes.
  await webhook(request as unknown as WebhookRequest, {
    status: (code) => {
      status = code;
    },
    json: (value) => {
      body = value;
    },
  });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
