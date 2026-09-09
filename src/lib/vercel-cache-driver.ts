import type {
  CacheDriver,
  CacheSetOptions,
} from '@datum-cloud/strapi-revalidate';
import { type RuntimeCache, getCache } from '@vercel/functions';

export interface VercelRuntimeCacheDriverOptions {
  namespace: string;
}

/**
 * Adapts Vercel's Runtime Cache — a per-region KV store shared across every
 * concurrent function instance, and persistent across deploys — to
 * strapi-revalidate's `CacheDriver` contract. Replaces the previous
 * filesystem driver, whose `/tmp` storage was private to a single serverless
 * instance and reset on every cold start/deploy, defeating the TTL.
 *
 * Runtime Cache has no bulk-enumeration or clear-everything primitive, so
 * `keys()`/`clear()` are no-ops — this codebase only ever invalidates via
 * `deleteByTag` (the Strapi webhook), never a full flush.
 */
export class VercelRuntimeCacheDriver implements CacheDriver {
  private readonly cache: RuntimeCache;

  constructor(options: VercelRuntimeCacheDriverOptions) {
    this.cache = getCache({ namespace: options.namespace });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cache.get(key);
    return (value ?? null) as T | null;
  }

  async set<T>(
    key: string,
    data: T,
    options: CacheSetOptions = {}
  ): Promise<void> {
    await this.cache.set(key, data, { ttl: options.ttl, tags: options.tags });
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async deleteByTag(tag: string): Promise<void> {
    await this.cache.expireTag(tag);
  }

  async clear(): Promise<void> {
    // Not supported by Runtime Cache — not exercised by this codebase.
  }

  async keys(): Promise<string[]> {
    // Not supported by Runtime Cache — not exercised by this codebase.
    return [];
  }
}
