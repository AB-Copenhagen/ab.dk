import { CacheManager, FileCacheDriver } from '@datum-cloud/strapi-revalidate';

// EventBilletten's ticketing platform is vivenu (docs.vivenu.com) — "EventBilletten"
// is the brand fans and the membership webhook (eventbilletten-webhook.ts) know it
// by, but every endpoint below is vivenu's own REST API. Seller API key, needs the
// customers:list, tickets:list, subscriptions:list and events:list permissions.
const apiBaseUrl =
  (import.meta.env.EVENTBILLETTEN_API_URL as string | undefined) ??
  'https://vivenu.com/api';
const apiKey = import.meta.env.EVENTBILLETTEN_API_KEY as string | undefined;

// Short TTL and per-email cache keys — this is a specific fan's tickets and
// subscriptions, not public catalog data, so entries must never be shared
// across visitors and shouldn't be stale for long after a fresh purchase.
const CACHE_DIR = '/tmp/eventbilletten-admin-cache';
const cache = new CacheManager({
  primary: new FileCacheDriver({ dir: CACHE_DIR }),
  fallback: new FileCacheDriver({ dir: `${CACHE_DIR}-fallback` }),
  defaultTtl: 60 * 2,
});

export interface EventbillettenTicketSummary {
  id: string;
  eventId: string;
  eventName?: string;
  eventStart?: string;
  ticketName: string;
  status: 'VALID' | 'INVALID' | 'RESERVED' | 'DETAILSREQUIRED' | 'BLANK';
  seat: string | null;
  barcode: string;
}

export interface EventbillettenSubscriptionSummary {
  id: string;
  planId: string;
  planName?: string;
  status:
    | 'DRAFT'
    | 'ACTIVE'
    | 'INCOMPLETE'
    | 'CANCELED'
    | 'ARCHIVED'
    | 'PENDING-CANCELLATION';
  startAt: string | null;
  nextBillingDate: string | null;
  price: number | null;
  currency: string | null;
}

interface EventbillettenMemberData {
  tickets: EventbillettenTicketSummary[];
  subscriptions: EventbillettenSubscriptionSummary[];
}

async function cacheKeyForEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `eventbilletten-admin-member-${hash}`;
}

async function vivenuGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface VivenuCustomer {
  _id: string;
}

// The list-response wrapper isn't consistent across what vivenu's docs show
// (customers/webhooks use `docs`/`total`; a model-summarized part of the
// tickets page suggested `rows`/`total`) — accept either rather than guessing.
interface VivenuListResponse<T> {
  docs?: T[];
  rows?: T[];
  total?: number;
}

function listItems<T>(response: VivenuListResponse<T> | null): T[] {
  return response?.docs ?? response?.rows ?? [];
}

interface VivenuTicket {
  _id: string;
  eventId: string;
  ticketName: string;
  status: EventbillettenTicketSummary['status'];
  barcode: string;
  seat?: string;
}

interface VivenuSubscription {
  _id: string;
  planId: string;
  status: EventbillettenSubscriptionSummary['status'];
  startAt?: string;
  currency?: string;
  items?: { price?: number }[];
  billing?: { cycles?: { due?: string; status?: string }[] };
}

interface VivenuEvent {
  _id: string;
  name: string;
  start: string;
}

interface VivenuSubscriptionPlan {
  _id: string;
  name: string;
}

async function resolveCustomerId(email: string): Promise<string | null> {
  const result = await vivenuGet<VivenuListResponse<VivenuCustomer>>(
    `/customers/rich?email=${encodeURIComponent(email)}&top=1`
  );
  return listItems(result)[0]?._id ?? null;
}

async function fetchEventNamesByIds(
  eventIds: string[]
): Promise<Map<string, VivenuEvent>> {
  const uniqueIds = [...new Set(eventIds)];
  const events = await Promise.all(
    uniqueIds.map((id) => vivenuGet<VivenuEvent>(`/events/${id}`))
  );
  const byId = new Map<string, VivenuEvent>();
  events.forEach((event, i) => {
    if (event) byId.set(uniqueIds[i], event);
  });
  return byId;
}

function nextBillingDate(sub: VivenuSubscription): string | null {
  const upcoming = (sub.billing?.cycles ?? []).find(
    (cycle) => cycle.status === 'SCHEDULED'
  );
  return upcoming?.due ?? null;
}

async function fetchPlanNamesByIds(
  planIds: string[]
): Promise<Map<string, string>> {
  // UNVERIFIED: a plan-name endpoint (e.g. GET /api/subscriptions/plans/:id)
  // wasn't confirmed in vivenu's docs — only referenced via a model-summarized,
  // unread part of the subscriptions page. Degrades to showing the bare planId
  // if this 404s; confirm the real endpoint against a live account before
  // relying on plan names rendering.
  const uniqueIds = [...new Set(planIds)];
  const plans = await Promise.all(
    uniqueIds.map((id) =>
      vivenuGet<VivenuSubscriptionPlan>(`/subscriptions/plans/${id}`)
    )
  );
  const byId = new Map<string, string>();
  plans.forEach((plan, i) => {
    if (plan?.name) byId.set(uniqueIds[i], plan.name);
  });
  return byId;
}

/**
 * Looks up a fan's EventBilletten tickets and subscriptions by email via
 * vivenu's Admin API — no second ticketing login, since this reuses the same
 * email already verified by the Descope session.
 *
 * NOT verified against a live vivenu account yet; confirm the exact field
 * names and list-response shape (see the `docs`/`rows` fallback above and the
 * plan-name caveat) against a real seller account before shipping — same kind
 * of "built from docs, not yet exercised live" caution as shopify-admin.ts.
 */
export async function fetchMemberDataByEmail(
  email: string
): Promise<EventbillettenMemberData> {
  const empty: EventbillettenMemberData = { tickets: [], subscriptions: [] };
  if (!apiKey || !email.trim()) return empty;

  const key = await cacheKeyForEmail(email);
  const result = await cache.getWithFallback<EventbillettenMemberData>(
    key,
    async () => {
      const customerId = await resolveCustomerId(email);
      if (!customerId) return empty;

      const [ticketsResult, subscriptionsResult] = await Promise.all([
        vivenuGet<VivenuListResponse<VivenuTicket>>(
          `/tickets?customerId=${customerId}&top=50`
        ),
        vivenuGet<VivenuListResponse<VivenuSubscription>>(
          `/subscriptions?customerId=${customerId}&top=50`
        ),
      ]);
      const rawTickets = listItems(ticketsResult);
      const rawSubscriptions = listItems(subscriptionsResult);

      const [eventsById, planNamesById] = await Promise.all([
        fetchEventNamesByIds(rawTickets.map((t) => t.eventId)),
        fetchPlanNamesByIds(rawSubscriptions.map((s) => s.planId)),
      ]);

      const tickets: EventbillettenTicketSummary[] = rawTickets.map((t) => ({
        id: t._id,
        eventId: t.eventId,
        eventName: eventsById.get(t.eventId)?.name,
        eventStart: eventsById.get(t.eventId)?.start,
        ticketName: t.ticketName,
        status: t.status,
        seat: t.seat ?? null,
        barcode: t.barcode,
      }));

      const subscriptions: EventbillettenSubscriptionSummary[] =
        rawSubscriptions.map((s) => ({
          id: s._id,
          planId: s.planId,
          planName: planNamesById.get(s.planId),
          status: s.status,
          startAt: s.startAt ?? null,
          nextBillingDate: nextBillingDate(s),
          price: s.items?.[0]?.price ?? null,
          currency: s.currency ?? null,
        }));

      return { tickets, subscriptions };
    },
    { tags: ['eventbilletten-admin-member'] }
  );

  return result ?? empty;
}
