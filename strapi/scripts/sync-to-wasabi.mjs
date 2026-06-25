#!/usr/bin/env node
/**
 * sync-to-wasabi.mjs — Migrate existing local Strapi uploads to Wasabi
 *
 * Reads all files with provider='local' from the Strapi SQLite database,
 * uploads them (and their thumbnail variants) to Wasabi, then updates the
 * database records to point to the new Wasabi URLs.
 *
 * Prerequisites:
 *   • Fill in WASABI_* vars in strapi/.env
 *   • Stop Strapi before running (or use DRY_RUN=1 to preview)
 *
 * Usage (from project root):
 *   node --env-file=strapi/.env strapi/scripts/sync-to-wasabi.mjs
 *
 * Options (env vars):
 *   DRY_RUN=1      Preview what would be uploaded without touching anything
 *   CONCURRENCY=N  Parallel uploads per batch (default: 20)
 *   SKIP_EXISTING=0 Re-upload even if the file already exists on Wasabi
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Config ────────────────────────────────────────────────────────────────────

const {
  WASABI_ACCESS_KEY_ID: ACCESS_KEY,
  WASABI_SECRET_ACCESS_KEY: SECRET_KEY,
  WASABI_BUCKET: BUCKET,
  WASABI_REGION: REGION = 'eu-central-1',
  WASABI_ENDPOINT: ENDPOINT = `https://s3.eu-central-1.wasabisys.com`,
  DRY_RUN,
  CONCURRENCY,
  SKIP_EXISTING = '1',
} = process.env;

const isDry = DRY_RUN === '1';
const concurrency = parseInt(CONCURRENCY || '20', 10);
const skipExisting = SKIP_EXISTING !== '0';

if (!isDry && (!ACCESS_KEY || !SECRET_KEY || !BUCKET)) {
  console.error('Missing required env vars: WASABI_ACCESS_KEY_ID, WASABI_SECRET_ACCESS_KEY, WASABI_BUCKET');
  console.error('Run with: node --env-file=strapi/.env strapi/scripts/sync-to-wasabi.mjs');
  process.exit(1);
}

const STRAPI_ROOT = resolve(__dirname, '../..');
const UPLOADS_DIR = join(STRAPI_ROOT, 'strapi/public/uploads');
const DB_PATH = join(STRAPI_ROOT, 'strapi/.tmp/data.db');

// ── S3 client (Wasabi) ────────────────────────────────────────────────────────

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: false,
});

function wasabiUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.wasabisys.com/${key}`;
}

function s3Key(localUrl) {
  // /uploads/foo_abc123.jpg  →  uploads/foo_abc123.jpg
  return localUrl.replace(/^\//, '');
}

// ── Upload helpers ────────────────────────────────────────────────────────────

async function fileExistsOnWasabi(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(localPath, key, mime) {
  const stat = statSync(localPath);
  const stream = createReadStream(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: stream,
    ContentType: mime || 'application/octet-stream',
    ContentLength: stat.size,
    ACL: 'public-read',
  }));
}

// ── Formats (thumbnail variants) ─────────────────────────────────────────────

async function migrateFormats(formatsJson, mime) {
  if (!formatsJson) return null;
  let formats;
  try {
    formats = typeof formatsJson === 'string' ? JSON.parse(formatsJson) : formatsJson;
  } catch {
    return formatsJson;
  }
  if (!formats || typeof formats !== 'object') return formatsJson;

  const updated = { ...formats };

  for (const [sizeName, variant] of Object.entries(formats)) {
    if (!variant?.url) continue;
    if (!variant.url.startsWith('/uploads/')) continue;

    const key = s3Key(variant.url);
    const localPath = join(UPLOADS_DIR, variant.url.replace('/uploads/', ''));

    if (!existsSync(localPath)) {
      process.stdout.write(`  ⚠ Missing thumbnail: ${localPath}\n`);
      continue;
    }

    if (!isDry) {
      const alreadyThere = skipExisting && await fileExistsOnWasabi(key);
      if (!alreadyThere) {
        await uploadFile(localPath, key, variant.mime || mime);
      }
    }

    updated[sizeName] = { ...variant, url: wasabiUrl(key) };
  }

  return JSON.stringify(updated);
}

// ── Batch runner ──────────────────────────────────────────────────────────────

async function runBatch(items, fn) {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(fn));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(isDry ? '=== DRY RUN — nothing will be uploaded ===' : '=== AB.dk: Migrate uploads → Wasabi ===');
  console.log(`Uploads dir: ${UPLOADS_DIR}`);
  console.log(`Database:    ${DB_PATH}`);
  if (!isDry) console.log(`Bucket:      s3://${BUCKET} (${REGION})\n`);

  // Load SQLite
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);

  // Fetch all local files
  const rows = db.prepare(`SELECT id, name, url, mime, formats, provider FROM files WHERE provider = 'local'`).all();
  console.log(`Found ${rows.length} local file(s) to migrate\n`);

  if (rows.length === 0) {
    console.log('Nothing to do — all files already on Wasabi.');
    db.close();
    return;
  }

  let done = 0, skipped = 0, failed = 0;

  const updateStmt = isDry ? null : db.prepare(
    `UPDATE files SET url = ?, provider = 'aws-s3', provider_metadata = ?, formats = ?, updated_at = datetime('now') WHERE id = ?`
  );

  await runBatch(rows, async (row) => {
    const key = s3Key(row.url);
    const localPath = join(UPLOADS_DIR, row.url.replace('/uploads/', ''));
    const targetUrl = wasabiUrl(key);

    try {
      if (!existsSync(localPath)) {
        process.stdout.write(`  ✗ Missing: ${row.url}\n`);
        failed++;
        return;
      }

      if (isDry) {
        process.stdout.write(`  [DRY] ${row.url} → ${targetUrl}\n`);
        done++;
        return;
      }

      // Upload main file
      const alreadyThere = skipExisting && await fileExistsOnWasabi(key);
      if (!alreadyThere) {
        await uploadFile(localPath, key, row.mime);
      } else {
        skipped++;
      }

      // Upload + update thumbnail formats
      const updatedFormats = await migrateFormats(row.formats, row.mime);

      // Update database record
      updateStmt.run(
        targetUrl,
        JSON.stringify({ key, ETag: null }),
        updatedFormats,
        row.id
      );

      done++;
      if ((done + failed) % 50 === 0 || done === rows.length) {
        process.stdout.write(`  ↑ ${done + failed}/${rows.length} (${skipped} skipped, ${failed} failed)\n`);
      }
    } catch (err) {
      process.stdout.write(`  ✗ ${row.name}: ${err.message}\n`);
      failed++;
    }
  });

  db.close();

  console.log(`\n${'─'.repeat(48)}`);
  console.log(`✓ Uploaded:     ${done - skipped}`);
  console.log(`  Already there: ${skipped}`);
  console.log(`✗ Failed:       ${failed}`);
  console.log(`Total:          ${rows.length}`);

  if (!isDry && failed === 0) {
    console.log('\nAll files migrated. Restart Strapi to apply changes.');
  } else if (!isDry && failed > 0) {
    console.log(`\n${failed} file(s) failed. Re-run to retry (existing uploads are skipped).`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
