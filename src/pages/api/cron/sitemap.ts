import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { APIContext } from 'astro';

import {
  SITEMAP_STORAGE_KEY,
  buildSitemapEntries,
  buildSitemapXml,
} from '@/lib/sitemap';

export const prerender = false;

const BUCKET = import.meta.env.WASABI_BUCKET ?? 'ab-media';
const REGION = import.meta.env.WASABI_REGION ?? 'eu-central-1';
const ENDPOINT = `https://s3.${REGION}.wasabisys.com`;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: import.meta.env.WASABI_ACCESS_KEY_ID ?? '',
    secretAccessKey: import.meta.env.WASABI_SECRET_ACCESS_KEY ?? '',
  },
});

const CRON_SECRET = import.meta.env.CRON_SECRET;

// Triggered daily by the Vercel Cron entry in vercel.json. Vercel sends
// `Authorization: Bearer $CRON_SECRET` on cron-invoked requests when
// CRON_SECRET is set as a project env var — without it this endpoint would
// let anyone trigger a full Strapi/SI re-fetch on demand.
export async function GET(context: APIContext) {
  if (
    !CRON_SECRET ||
    context.request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
  const entries = await buildSitemapEntries(site);
  const xml = buildSitemapXml(entries);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: SITEMAP_STORAGE_KEY,
      Body: xml,
      ContentType: 'application/xml; charset=UTF-8',
    })
  );

  return new Response(JSON.stringify({ ok: true, entries: entries.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
