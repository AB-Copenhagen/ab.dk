import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';

import { descope } from '@/lib/descope-server';
import { MEMBERSHIP_TIERS } from '@/lib/membership';

export const prerender = false;

const WEBHOOK_SECRET = import.meta.env.EVENTBILLETTEN_WEBHOOK_SECRET;

interface SubscriptionChangedPayload {
  eventbillettenUuid?: string;
  tier?: string;
}

// EventBilletten calls this on every membership subscription change. Fails
// closed like the cron secret check in api/cron/sitemap.ts — an unset secret
// means "no valid caller," not "trust everyone".
//
// ASSUMPTION TO CONFIRM: this verifies a static `Authorization: Bearer` shared
// secret. If EventBilletten actually signs deliveries (e.g. an HMAC signature
// header, Stripe/Shopify-style) instead of sending a static bearer token, swap
// this check for signature verification against their docs before relying on it.
// Likewise, confirm the exact payload field names below (eventbillettenUuid, tier)
// against their actual webhook schema — these are our side's assumed shape.
/** Constant-time comparison — a naive `!==` leaks timing information proportional to how many leading bytes match, letting an attacker brute-force the secret byte-by-byte. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!WEBHOOK_SECRET || !safeEqual(authHeader, `Bearer ${WEBHOOK_SECRET}`)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!descope) {
    return new Response('Descope not configured', { status: 500 });
  }

  const payload = (await request
    .json()
    .catch(() => null)) as SubscriptionChangedPayload | null;
  const { eventbillettenUuid, tier } = payload ?? {};

  if (!eventbillettenUuid || !tier) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing eventbillettenUuid or tier',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!(MEMBERSHIP_TIERS as readonly string[]).includes(tier)) {
    return new Response(
      JSON.stringify({ success: false, error: `Unknown tier: ${tier}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: searchResult } = await descope.management.user.search({
    customAttributes: { eventbillettenUuid },
    limit: 1,
  });
  const user = searchResult?.users?.[0];

  if (!user) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `No Descope user found for eventbillettenUuid ${eventbillettenUuid}`,
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await descope.management.user.patch(user.userId, {
    customAttributes: { currentTier: tier },
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
