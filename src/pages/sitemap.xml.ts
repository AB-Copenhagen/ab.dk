import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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

// Content is regenerated once a day by the /api/cron/sitemap job, so a
// generous CDN TTL is safe — crawlers hitting this hourly all get served the
// same cached copy instead of triggering a fresh Strapi/SI fetch each time.
const CACHE_CONTROL =
  'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(context: APIContext) {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: SITEMAP_STORAGE_KEY })
    );
    if (res.Body) {
      return new Response(res.Body as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': CACHE_CONTROL,
        },
      });
    }
  } catch {
    // Not yet generated (first deploy before the cron has run) or a Wasabi
    // hiccup — fall through to generating it on demand below.
  }

  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
  const entries = await buildSitemapEntries(site);
  const xml = buildSitemapXml(entries);

  // Best-effort write-back so the next hit is served straight from Wasabi
  // instead of re-running this fallback until the next cron cycle.
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: SITEMAP_STORAGE_KEY,
        Body: xml,
        ContentType: 'application/xml; charset=UTF-8',
      })
    );
  } catch {
    // Non-fatal — the response below is served either way.
  }

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}
