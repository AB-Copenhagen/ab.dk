/**
 * Converts existing Wasabi-stored uploads (jpeg/png) to WebP, in place.
 *
 * Strapi's own `sizeOptimization`/`responsiveDimensions` (see config/plugins.ts)
 * only run at upload time and never change format — this is the separate,
 * scheduled backfill (and steady-state pass) that gets everything to WebP,
 * triggered on a cron via the `media.optimizeWebp` controller.
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Core } from '@strapi/strapi';
import sharp from 'sharp';

const CONVERTIBLE_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];
const ROOT_PATH = 'uploads';

const BUCKET = process.env.WASABI_BUCKET ?? 'ab-media';
const REGION = process.env.WASABI_REGION ?? 'eu-central-1';
const ENDPOINT = process.env.WASABI_ENDPOINT ?? `https://s3.${REGION}.wasabisys.com`;
const QUALITY = parseInt(process.env.WEBP_QUALITY ?? '80', 10);

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  // Matches the existing sync-to-wasabi.mjs/set-wasabi-cors.mjs scripts —
  // virtual-hosted-style URLs, same as what's already stored in `file.url`.
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY ?? '',
  },
});

function wasabiUrl(key: string) {
  return `https://${BUCKET}.s3.${REGION}.wasabisys.com/${key}`;
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Downloads `${ROOT_PATH}/${hash}${ext}`, re-encodes to WebP, uploads under the same hash, deletes the original. */
async function convertObject(hash: string, ext: string) {
  const oldKey = `${ROOT_PATH}/${hash}${ext}`;
  const newKey = `${ROOT_PATH}/${hash}.webp`;

  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: oldKey }));
  const original = await streamToBuffer(Body);
  const converted = await sharp(original).webp({ quality: QUALITY }).toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: converted,
      ContentType: 'image/webp',
      ACL: 'private',
    })
  );
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }));

  return { url: wasabiUrl(newKey), size: Math.round(converted.length / 1024) };
}

type ConversionResult = {
  scanned: number;
  converted: number;
  failed: number;
  errors: string[];
};

export async function optimizeBatch(strapi: Core.Strapi, batchSize: number): Promise<ConversionResult> {
  // Filtering on the original raster mimes makes this idempotent: once a
  // file's mime flips to image/webp below, it stops matching this query and
  // won't be picked up again on the next scheduled run.
  const files = await strapi.db.query('plugin::upload.file').findMany({
    where: { mime: { $in: CONVERTIBLE_MIMES } },
    limit: batchSize,
  });

  const result: ConversionResult = { scanned: files.length, converted: 0, failed: 0, errors: [] };

  for (const file of files) {
    try {
      const main = await convertObject(file.hash, file.ext);

      const formats = file.formats ? { ...(file.formats as Record<string, any>) } : null;
      if (formats) {
        for (const [size, variant] of Object.entries(formats)) {
          if (!variant?.hash || !variant?.ext) continue;
          const convertedVariant = await convertObject(variant.hash, variant.ext);
          formats[size] = {
            ...variant,
            ext: '.webp',
            mime: 'image/webp',
            url: convertedVariant.url,
            size: convertedVariant.size,
          };
        }
      }

      await strapi.db.query('plugin::upload.file').update({
        where: { id: file.id },
        data: {
          ext: '.webp',
          mime: 'image/webp',
          url: main.url,
          size: main.size,
          formats,
        },
      });

      result.converted++;
    } catch (err) {
      result.failed++;
      result.errors.push(`file ${file.id} (${file.name}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
