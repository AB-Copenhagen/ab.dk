import { strapi } from '@strapi/client';
import type { API } from '@strapi/client';

const STRAPI_URL = import.meta.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_API_TOKEN;

function createClient() {
  return strapi({
    baseURL: `${STRAPI_URL}/api`,
    auth: STRAPI_TOKEN ? { type: 'api-token', token: STRAPI_TOKEN } : undefined,
  });
}

export async function fetchCollectionType<T = API.Document[]>(
  collectionName: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const { data } = await createClient()
    .collection(collectionName)
    .find({ ...options, status: 'published' });
  return data as T;
}

export async function fetchSingleType<T = API.Document>(
  singleTypeName: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const { data } = await createClient()
    .single(singleTypeName)
    .find({ ...options, status: 'published' });
  return data as T;
}

export async function fetchDocument<T = API.Document>(
  collectionName: string,
  documentId: string,
  options?: API.BaseQueryParams,
): Promise<T> {
  const { data } = await createClient()
    .collection(collectionName)
    .findOne(documentId, { ...options, status: 'published' });
  return data as T;
}

export function strapiMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
}
