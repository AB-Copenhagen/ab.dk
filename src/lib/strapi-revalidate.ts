import {
  CacheManager,
  createWebhookHandler,
  revalidateConfigSchema,
} from '@datum-cloud/strapi-revalidate';

import { VercelRuntimeCacheDriver } from '@/lib/vercel-cache-driver';

const STRAPI_URL = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN =
  (import.meta.env.STRAPI_API_TOKEN as string | undefined)?.trim() || undefined;
const STRAPI_WEBHOOK_SECRET =
  (import.meta.env.STRAPI_WEBHOOK_SECRET as string | undefined)?.trim() ||
  undefined;

// Vercel's Runtime Cache — a per-region KV shared across every concurrent
// function instance, and persistent across deploys/cold starts. Replaces a
// previous /tmp file cache, which was private to a single instance and reset
// on every cold start/deploy, so the TTL below barely ever paid off in practice.
const primary = new VercelRuntimeCacheDriver({ namespace: 'strapi' });
const fallback = new VercelRuntimeCacheDriver({ namespace: 'strapi-fallback' });

export const cache = new CacheManager({
  primary,
  fallback,
  defaultTtl: 60 * 5, // 5 minutes
});

// strapi-revalidate's default tag mapping derives a tag from the webhook
// payload's `uid` by taking the *singular* segment (`api::partner.partner` →
// `partner`), with only `article`/`author` special-cased to their plurals.
// Every `fetchCollectionType()` call site in src/lib/strapi/client.ts tags its
// cache entries with the *plural* REST path instead (`fetchCollectionType('partners', ...)`
// tags `partners`), since that's the string callers actually pass in. Without
// this override, a real webhook delivery would resolve to a tag Vercel Runtime
// Cache never wrote (e.g. `partner` instead of `partners`) and silently
// invalidate nothing — the cache would still only ever refresh via TTL expiry,
// defeating the entire point of wiring up the webhook.
const TAG_MAP: Record<string, string[]> = {
  'api::category.category': ['categories'],
  'api::page.page': ['pages'],
  'api::product.product': ['products'],
  'api::player.player': ['players'],
  'api::match-content.match-content': ['match-contents'],
  'api::partner.partner': ['partners'],
  'api::hero-slide.hero-slide': ['hero-slides'],
  'api::leadership-member.leadership-member': ['leadership-members'],
  'api::investor.investor': ['investors'],
  'api::staff.staff': ['staff-members'],
};

// Webhook handler — wired up but optional. Configure a Strapi webhook entry
// pointing at /api/strapi-webhook to get instant cache invalidation on publish.
// Works without it: cache expires after TTL and refreshes on next request.
// `cache` above is passed in pre-built, so the schema's own `cache.*` driver
// config (file/memory/redis) is never consulted — omitted here accordingly.
const config = revalidateConfigSchema.parse({
  url: STRAPI_URL,
  token: STRAPI_TOKEN,
  webhook: { secret: STRAPI_WEBHOOK_SECRET, tagMap: TAG_MAP },
});

export const webhook = createWebhookHandler({ config, cache });

export { STRAPI_URL, STRAPI_TOKEN };
