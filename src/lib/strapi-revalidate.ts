import {
  CacheManager,
  FileCacheDriver,
  createWebhookHandler,
  revalidateConfigSchema,
} from '@datum-cloud/strapi-revalidate';

const STRAPI_URL = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_API_TOKEN as string | undefined;
const STRAPI_WEBHOOK_SECRET = import.meta.env.STRAPI_WEBHOOK_SECRET as
  string | undefined;
// /tmp is writable on Vercel serverless; project dir is not.
const CACHE_DIR = '/tmp/strapi-cache';

const primary = new FileCacheDriver({ dir: CACHE_DIR });
const fallback = new FileCacheDriver({ dir: `${CACHE_DIR}-fallback` });

export const cache = new CacheManager({
  primary,
  fallback,
  defaultTtl: 60 * 60, // 1 hour
});

// Webhook handler — wired up but optional. Configure a Strapi webhook entry
// pointing at /api/strapi-webhook to get instant cache invalidation on publish.
// Works without it: cache expires after TTL and refreshes on next request.
const config = revalidateConfigSchema.parse({
  url: STRAPI_URL,
  token: STRAPI_TOKEN,
  cache: {
    driver: 'file',
    dir: CACHE_DIR,
    fallbackDir: `${CACHE_DIR}-fallback`,
  },
  webhook: { secret: STRAPI_WEBHOOK_SECRET },
});

export const webhook = createWebhookHandler({ config, cache });

export { STRAPI_URL, STRAPI_TOKEN };
