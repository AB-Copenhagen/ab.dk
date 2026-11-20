import { CacheManager, FileCacheDriver } from '@datum-cloud/strapi-revalidate';

const domain = import.meta.env.SHOPIFY_DOMAIN as string | undefined;
// Admin API token (different credential from the public Storefront token in
// shopify.ts) — needs the read_orders + read_customers scopes. Never exposed
// to the client; only called from server-rendered pages/API routes.
const adminAccessToken = import.meta.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN as
  string | undefined;

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
  if (!domain || !adminAccessToken || !email.trim()) return [];

  const key = await cacheKeyForEmail(email);
  const result = await cache.getWithFallback<OrdersByEmailData | null>(
    key,
    async () => {
      try {
        const res = await fetch(
          `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': adminAccessToken,
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
