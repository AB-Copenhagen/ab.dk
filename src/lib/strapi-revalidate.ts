import { createStrapiRevalidate } from '@datum-cloud/strapi-revalidate';

// Module-level singleton — shared across all requests in the same process.
// The cache and webhook handler are initialised once; the cache.invalidate()
// path is safe to call concurrently.
export const { cache, webhook } = createStrapiRevalidate({
  url: import.meta.env.STRAPI_URL ?? 'http://localhost:1337',
  token: import.meta.env.STRAPI_API_TOKEN as string | undefined,
  transport: 'graphql',
  cache: { driver: 'memory' },
  webhook: {
    secret: import.meta.env.STRAPI_WEBHOOK_SECRET as string | undefined,
    // Extend the default tag map for content types specific to this project.
    tagMap: {
      'api::global.global': ['global'],
      'api::blog-page.blog-page': ['blog-page'],
    },
  },
});
