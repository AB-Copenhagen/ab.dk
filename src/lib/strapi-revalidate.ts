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

// Webhook handler — wired up but optional. Configure a Strapi webhook entry
// pointing at /api/strapi-webhook to get instant cache invalidation on publish.
// Works without it: cache expires after TTL and refreshes on next request.
// `cache` above is passed in pre-built, so the schema's own `cache.*` driver
// config (file/memory/redis) is never consulted — omitted here accordingly.
const config = revalidateConfigSchema.parse({
  url: STRAPI_URL,
  token: STRAPI_TOKEN,
  webhook: { secret: STRAPI_WEBHOOK_SECRET },
});

export const webhook = createWebhookHandler({ config, cache });

export { STRAPI_URL, STRAPI_TOKEN };
