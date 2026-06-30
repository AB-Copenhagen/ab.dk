import { strapi } from '@strapi/client';
import type { API } from '@strapi/client';
import { cache } from '@/lib/strapi-revalidate';

const STRAPI_URL = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_API_TOKEN;

function createClient() {
  return strapi({
    baseURL: `${STRAPI_URL}/api`,
    auth: STRAPI_TOKEN ? { type: 'api-token', token: STRAPI_TOKEN } : undefined,
  });
}

function collectionCacheKey(name: string, options?: API.BaseQueryParams): string {
  return `strapi-${name}-${JSON.stringify(options ?? {})}`;
}

export async function fetchCollectionType<T = API.Document[]>(
  collectionName: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const key = collectionCacheKey(collectionName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .find({ ...options, status: 'published' });
      return data as T;
    },
    { tags: [collectionName] },
  );
  return result ?? ([] as unknown as T);
}

export async function fetchSingleType<T = API.Document>(
  singleTypeName: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const key = collectionCacheKey(singleTypeName, options);
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .single(singleTypeName)
        .find({ ...options, status: 'published' });
      return data as T;
    },
    { tags: [singleTypeName] },
  );
  return result as T;
}

export async function fetchDocument<T = API.Document>(
  collectionName: string,
  documentId: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const key = `strapi-${collectionName}-doc-${documentId}-${JSON.stringify(options ?? {})}`;
  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      const { data } = await createClient()
        .collection(collectionName)
        .findOne(documentId, { ...options, status: 'published' });
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
