import type { APIRoute } from 'astro';

import { rejectIfBot } from '@/lib/bot-check';
import { addToMailingList } from '@/lib/mailgun';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const botResponse = await rejectIfBot();
  if (botResponse) return botResponse;

  const json = await request.json().catch(() => null);

  if (!json || typeof json.email !== 'string') {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const email = json.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid email' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const listAddress = import.meta.env.MAILGUN_LIST_ADDRESS ?? '';
  if (!listAddress) {
    return new Response(
      JSON.stringify({ success: false, error: 'Newsletter not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
    console.error('[api/subscribe] failed:', message);
    // Generic message to the client — the real detail is logged above, not
    // returned, since it can include internal error text not meant for an end user.
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to subscribe' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
