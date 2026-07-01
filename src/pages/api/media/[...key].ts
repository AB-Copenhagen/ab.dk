import type { APIRoute } from 'astro';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(cmd);

    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=86400',
    };
    if (res.ContentType) headers['Content-Type'] = res.ContentType;
    if (res.ETag) headers['ETag'] = res.ETag;
    if (res.ContentLength) headers['Content-Length'] = String(res.ContentLength);

    return new Response(res.Body as ReadableStream, { status: 200, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
