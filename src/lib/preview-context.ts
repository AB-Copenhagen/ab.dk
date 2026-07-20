import { AsyncLocalStorage } from 'node:async_hooks';

export const PREVIEW_COOKIE = 'strapi_preview';

// Astro has no built-in per-request equivalent of Next's `draftMode()`. This carries
// the current request's preview state down into lib/strapi/client.ts without having
// to thread it through every page's fetchCollectionType/fetchDocument call site.
const storage = new AsyncLocalStorage<boolean>();

export function runWithPreview<T>(enabled: boolean, fn: () => T): T {
  return storage.run(enabled, fn);
}

export function isPreviewEnabled(): boolean {
  return storage.getStore() ?? false;
}
