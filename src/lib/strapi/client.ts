import { strapi } from '@strapi/client';
import { cache } from '@/lib/strapi-revalidate';

const STRAPI_URL = (import.meta.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '');
const STRAPI_TOKEN: string | undefined = import.meta.env.STRAPI_API_TOKEN;

type QueryParams = {
  locale?: string;
  status?: 'draft' | 'published';
  sort?: string | string[];
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  fields?: string[];
  pagination?: { page?: number; pageSize?: number; start?: number; limit?: number };
};

function createClient() {
  return strapi({
    baseURL: `${STRAPI_URL}/api`,
    auth: STRAPI_TOKEN || undefined,
  });
}

function cacheKey(name: string, options?: QueryParams): string {
  return `strapi-${name}-${JSON.stringify(options ?? {})}`;
}

export async function fetchCollectionType<T = unknown[]>(
  collectionName: string,
  options?: QueryParams,
): Promise<T> {
  const key = cacheKey(collectionName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .find({ ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [collectionName] },
  );
  return result ?? ([] as unknown as T);
}

export async function fetchSingleType<T = unknown>(
  singleTypeName: string,
  options?: QueryParams,
): Promise<T> {
  const key = cacheKey(singleTypeName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .single(singleTypeName)
        .find({ ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [singleTypeName] },
  );
  return result as T;
}

export async function fetchDocument<T = unknown>(
  collectionName: string,
  documentId: string,
  options?: QueryParams,
): Promise<T> {
  const key = `strapi-${collectionName}-doc-${documentId}-${JSON.stringify(options ?? {})}`;
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .findOne(documentId, { ...options, status: 'published' } as never);
      return data as T;
    },
    { tags: [collectionName] },
  );
  return result as T;
}

export function strapiMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}
