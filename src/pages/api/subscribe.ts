import type { APIRoute } from 'astro';
import { addToMailingList } from '@/lib/mailgun';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const json = await request.json().catch(() => null);

  if (!json || typeof json.email !== 'string') {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = json.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const listAddress = import.meta.env.MAILGUN_LIST_ADDRESS ?? '';
  if (!listAddress) {
    return new Response(JSON.stringify({ success: false, error: 'Newsletter not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await addToMailingList(listAddress, {
      address: email,
      name: json.name?.trim() || undefined,
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
