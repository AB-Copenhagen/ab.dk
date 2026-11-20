import { CacheManager, FileCacheDriver } from '@datum-cloud/strapi-revalidate';

const domain = import.meta.env.SHOPIFY_DOMAIN as string | undefined;
// Admin API credentials (different from the public Storefront token in
// shopify.ts) — needs the read_orders + read_customers scopes. Never exposed
// to the client; only called from server-rendered pages/API routes.
//
// Two ways to authenticate, depending on how the custom app was created:
//   - a static Admin API access token, copied once from Shopify admin →
//     Settings → Apps and develop apps (legacy custom-app flow), OR
//   - a client_id/client_secret pair from an app built on Shopify's Dev
//     Dashboard, exchanged for a short-lived access token (see
//     getAdminAccessToken below) since that flow issues no static token at all.
const staticAdminAccessToken = import.meta.env
  .SHOPIFY_ADMIN_API_ACCESS_TOKEN as string | undefined;
const clientId = import.meta.env.SHOPIFY_CLIENT_ID as string | undefined;
const clientSecret = import.meta.env.SHOPIFY_CLIENT_SECRET as
  string | undefined;
// The client_credentials token endpoint only works against the store's
// permanent *.myshopify.com handle — confirmed live: pointing it at the
// custom storefront domain (SHOPIFY_DOMAIN, e.g. shop.ab.dk) failed with a
// 403 some of the time and an HTML error page (not JSON) the rest of the
// time, since that domain isn't proxied for this particular path. Falls back
// to `domain` only so a misconfigured deployment degrades to that same
// failure rather than throwing on a missing variable — set this explicitly.
const oauthDomain =
  (import.meta.env.SHOPIFY_MYSHOPIFY_DOMAIN as string | undefined) ?? domain;

export const shopifyOrdersConfigured = Boolean(
  domain && (staticAdminAccessToken || (clientId && clientSecret))
);

const API_VERSION = '2024-01';

// Short TTL and per-email cache keys — this is a specific fan's order history,
// not public catalog data like shopify.ts, so entries must never be shared
// across visitors and shouldn't be stale for long after a fresh purchase.
const CACHE_DIR = '/tmp/shopify-admin-cache';
const cache = new CacheManager({
  primary: new FileCacheDriver({ dir: CACHE_DIR }),
  fallback: new FileCacheDriver({ dir: `${CACHE_DIR}-fallback` }),
  defaultTtl: 60 * 2,
});

// Shopify's client_credentials grant always expires in exactly 24h
// (`expires_in: 86399`, per Shopify's docs) with no refresh token — renewing
// it just means sending the same request again. Cached just under that TTL
// so a live request is never made with an already-expired token.
const CLIENT_CREDENTIALS_TOKEN_TTL = 86399 - 60;

// Only works when this app and the store are in the same Shopify
// organization in the Dev Dashboard — Shopify rejects it otherwise with
// `shop_not_permitted: Client credentials cannot be performed on this shop`.
// A store outside the org needs a different grant (token exchange or
// authorization code), not supported here.
async function fetchAccessTokenViaClientCredentials(): Promise<string | null> {
  try {
    const res = await fetch(`https://${oauthDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });
    if (!res.ok) {
      console.error(
        `[shopify-admin] client_credentials token request -> ${res.status} ${res.statusText}`
      );
      return null;
    }
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch (err) {
    console.error(
      '[shopify-admin] client_credentials token request threw',
      err
    );
    return null;
  }
}

/** Resolves an Admin API access token, preferring a static one if set. */
async function getAdminAccessToken(): Promise<string | null> {
  if (staticAdminAccessToken) return staticAdminAccessToken;
  if (!domain || !clientId || !clientSecret) return null;
  return cache.getWithFallback<string>(
    'shopify-admin-oauth-token',
    fetchAccessTokenViaClientCredentials,
    { ttl: CLIENT_CREDENTIALS_TOKEN_TTL }
  );
}

export interface ShopifyOrderSummary {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: string;
  currencyCode: string;
  statusPageUrl: string | null;
}

interface GqlResponse<T> {
  data: T;
  errors?: { message: string }[];
}

async function cacheKeyForEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `shopify-admin-orders-${hash}`;
}

const ORDERS_BY_EMAIL_QUERY = `
  query OrdersByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
            edges {
              node {
                id
                name
                processedAt
                displayFinancialStatus
                displayFulfillmentStatus
                statusPageUrl
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  }
`;

type OrdersByEmailData = {
  customers: {
    edges: {
      node: {
        orders: {
          edges: {
            node: {
              id: string;
              name: string;
              processedAt: string;
              displayFinancialStatus: string | null;
              displayFulfillmentStatus: string | null;
              statusPageUrl: string | null;
              totalPriceSet: {
                shopMoney: { amount: string; currencyCode: string };
              };
            };
          }[];
        };
      };
    }[];
  };
};

/**
 * Looks up a fan's AB Store order history by email via the Shopify Admin API —
 * no second Shopify login, since this reuses the same email already verified
 * by the Descope session. NOT verified against a live Admin API token yet;
 * confirm the GraphQL shape (field names, API version) against a real store
 * before shipping — see the caveat on the eventbilletten webhook for the same
 * kind of "built from docs, not yet exercised live" caution.
 */
export async function fetchOrdersByEmail(
  email: string
): Promise<ShopifyOrderSummary[]> {
  if (!shopifyOrdersConfigured || !email.trim()) return [];

  const key = await cacheKeyForEmail(email);
  const result = await cache.getWithFallback<OrdersByEmailData | null>(
    key,
    async () => {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) return null;

      try {
        const res = await fetch(
          `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({
              query: ORDERS_BY_EMAIL_QUERY,
              variables: { query: `email:${email.trim()}` },
            }),
          }
        );
        if (!res.ok) {
          console.error(
            `[shopify-admin] orders GraphQL request -> ${res.status} ${res.statusText}`
          );
          return null;
        }
        const json = (await res.json()) as GqlResponse<OrdersByEmailData>;
        if (json.errors?.length) {
          console.error('[shopify-admin] orders GraphQL errors', json.errors);
          return null;
        }
        return json.data;
      } catch (err) {
        console.error('[shopify-admin] orders GraphQL request threw', err);
        return null;
      }
    },
    { tags: ['shopify-admin-orders'] }
  );

  const customer = result?.customers.edges[0]?.node;
  if (!customer) return [];

  return customer.orders.edges.map(({ node }) => ({
    id: node.id,
    name: node.name,
    processedAt: node.processedAt,
    financialStatus: node.displayFinancialStatus,
    fulfillmentStatus: node.displayFulfillmentStatus,
    totalPrice: node.totalPriceSet.shopMoney.amount,
    currencyCode: node.totalPriceSet.shopMoney.currencyCode,
    statusPageUrl: node.statusPageUrl,
  }));
}
