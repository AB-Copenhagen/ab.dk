#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
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
  if (existsSync(webpPath)) {
    skipped++;
    continue;
  }
  await sharp(file).webp({ quality: 85 }).toFile(webpPath);
  converted++;
  console.log(
    `converted: ${path.relative(IMAGES_DIR, file)} -> ${path.relative(IMAGES_DIR, webpPath)}`
  );
}

console.log(`\nDone. ${converted} converted, ${skipped} already had a .webp.`);
