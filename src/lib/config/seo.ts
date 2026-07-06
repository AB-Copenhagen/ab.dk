import { ALLOW_SEARCH_INDEXING } from 'astro:env/server';

/** Block crawlers until production launch — configured in astro.config.mjs. */
export function isSearchIndexingBlocked(): boolean {
  return !ALLOW_SEARCH_INDEXING;
}
