#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(import.meta.dirname, '..', 'public', 'images');
const SOURCE_EXT = /\.(png|jpe?g)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXT.test(entry.name)) {
      yield full;
    }
  }
}

let converted = 0;
let skipped = 0;

for await (const file of walk(IMAGES_DIR)) {
  const webpPath = file.replace(SOURCE_EXT, '.webp');
  // Regenerate whenever the source is newer than its .webp (or there's no
  // .webp yet) — so replacing a PNG/JPG in place can't leave a stale .webp
  // being served instead (browsers prefer the WebP <source> over the
  // fallback <img>, so a stale one silently wins).
  if (existsSync(webpPath)) {
    const [srcStat, webpStat] = await Promise.all([stat(file), stat(webpPath)]);
    if (srcStat.mtimeMs <= webpStat.mtimeMs) {
      skipped++;
      continue;
    }
  }
  await sharp(file).webp({ quality: 85 }).toFile(webpPath);
  converted++;
  console.log(
    `converted: ${path.relative(IMAGES_DIR, file)} -> ${path.relative(IMAGES_DIR, webpPath)}`
  );
  // Stage the regenerated file so a pre-commit invocation can't produce a
  // commit that still references the stale .webp it just replaced.
  try {
    execFileSync('git', ['add', webpPath]);
  } catch {
    /* not in a git repo / git unavailable — fine for a standalone run */
  }
}

console.log(`\nDone. ${converted} converted, ${skipped} already up to date.`);
