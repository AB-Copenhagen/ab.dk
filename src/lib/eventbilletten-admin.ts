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

export interface EventbillettenEventTicketGroup {
  eventId: string;
  eventName?: string;
  eventStart?: string;
  /**
   * Tickets you currently hold for this event (status VALID) — NOT the total
   * number ever issued. Confirmed live against billet.ab.dk's own "My
   * Tickets" page: one historical order for 20 tickets to a single match
   * shows there as "2 tickets", matching only the still-VALID rows (the
   * other 18 are INVALID — reissued/transferred away, not "used at the
   * gate"). Mirror that here rather than showing raw order size.
   */
  validCount: number;
}

/**
 * Collapses raw per-seat ticket rows into one card per event, the way
 * billet.ab.dk's own account pages present them — a season ticket or a
 * group booking can mean dozens of individual ticket rows for one match.
 * Events where every ticket has since been invalidated (fully transferred
 * or superseded) are dropped entirely, again matching what billet.ab.dk
 * itself shows.
 */
export function groupTicketsByEvent(
  tickets: EventbillettenTicketSummary[]
): EventbillettenEventTicketGroup[] {
  const byEvent = new Map<string, EventbillettenEventTicketGroup>();
  for (const ticket of tickets) {
    const group = byEvent.get(ticket.eventId) ?? {
      eventId: ticket.eventId,
      eventName: ticket.eventName,
      eventStart: ticket.eventStart,
      validCount: 0,
    };
    if (ticket.status === 'VALID') group.validCount += 1;
    byEvent.set(ticket.eventId, group);
  }
  return [...byEvent.values()].filter((group) => group.validCount > 0);
}

async function cacheKey(identifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(identifier.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `eventbilletten-admin-member-${hash}`;
}

// Logged (not swallowed) so a misconfigured/expired key or an unverified
// endpoint shape shows up in Vercel's runtime logs instead of silently
// rendering as "no tickets" forever — this integration hasn't been exercised
// against a live account yet (see the caveat on fetchMemberDataByEmail below).
async function vivenuGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(
        `[eventbilletten-admin] GET ${path} -> ${res.status} ${res.statusText}`
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[eventbilletten-admin] GET ${path} threw`, err);
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

// A membership-linked fan already carries their vivenu customer ID as
// Descope's `eventbillettenUuid` custom attribute (same one the
// eventbilletten-webhook looks a user up by, in the other direction) — shown
// to fans themselves as "MyAB Ticket ID" on the account page. Prefer it over
// an email search: it's already on the session with no extra API call, and
// sidesteps the unverified match semantics of `/customers/rich?email=`.
// Falls back to email search for a fan who hasn't been linked yet.
async function resolveCustomerId(
  email: string,
  knownCustomerId?: string
): Promise<string | null> {
  if (knownCustomerId) return knownCustomerId;
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
 * Looks up a fan's EventBilletten tickets and subscriptions via vivenu's Admin
 * API — by their linked vivenu customer ID (`eventbillettenUuid`, already on
 * the Descope session) when available, falling back to an email search for a
 * fan who hasn't been linked yet. No second ticketing login either way, since
 * this reuses identity already verified by the Descope session.
 *
 * NOT verified against a live vivenu account yet; confirm the exact field
 * names and list-response shape (see the `docs`/`rows` fallback above and the
 * plan-name caveat) against a real seller account before shipping — same kind
 * of "built from docs, not yet exercised live" caution as shopify-admin.ts.
 */
export async function fetchMemberDataByEmail(
  email: string,
  knownCustomerId?: string
): Promise<EventbillettenMemberData> {
  const empty: EventbillettenMemberData = { tickets: [], subscriptions: [] };
  if (!apiKey || (!email.trim() && !knownCustomerId)) return empty;

  const key = await cacheKey(knownCustomerId ?? email);
  const result = await cache.getWithFallback<EventbillettenMemberData>(
    key,
    async () => {
      const customerId = await resolveCustomerId(email, knownCustomerId);
      if (!customerId) return empty;

      // vivenu allows up to 1000 per page on both endpoints; a single season
      // ticket already produces dozens of per-seat, per-match ticket rows
      // (confirmed live: one order alone was 20 rows for one match), so 50
      // risked silently truncating a season-ticket holder's list well before
      // hitting a real plan or transaction limit.
      const [ticketsResult, subscriptionsResult] = await Promise.all([
        vivenuGet<VivenuListResponse<VivenuTicket>>(
          `/tickets?customerId=${customerId}&top=500`
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
