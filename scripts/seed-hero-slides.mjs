#!/usr/bin/env node
// One-off migration: pushes the 4 homepage hero slides currently hardcoded in
// src/components/homepage/Homepage.astro (captured below as FALLBACK_HERO_SLIDES's
// data source) into Strapi, so the slider switches from static data to
// fetchHeroSlides() without losing content.
//
// Idempotent: upserts by `name`, so it's safe to re-run (e.g. after fixing a video file).
//
// Usage: node --env-file=.env.local scripts/seed-hero-slides.mjs
//   (requires STRAPI_URL and a write-scoped STRAPI_API_TOKEN in .env.local)
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/$/,
  ''
);
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error(
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-hero-slides.mjs'
  );
  process.exit(1);
}

const ROOT_DIR = path.join(import.meta.dirname, '..');

// Text captured from src/lib/i18n.ts's hero* keys — once seeded, this content
// is edited in Strapi admin, not in the i18n dictionary.
const HERO_SLIDES = [
  {
    name: 'Division CTA',
    slideType: 'image',
    image: 'src/assets/images/hero-ab-returns.jpg',
    da: {
      alt: 'AB-spillere på lægterne i de nye udebanetrøjer',
      headline: 'AB vender tilbage til Betinia Liga',
      ctaLabel: 'Hele historien',
      ctaUrl: '/nyheder/ab-vender-tilbage-til-betinia-liga',
    },
    en: {
      alt: 'AB players in the stands wearing the new away kits',
      headline: 'AB returns to 1. Division',
      ctaLabel: 'Full Story',
      ctaUrl: '/en/news/ab-returns-to-1-division',
    },
  },
  {
    name: 'Merch Shop CTA',
    slideType: 'video',
    videoDa: 'public/videos/hero-merch-da.mp4',
    videoEn: 'public/videos/hero-merch-en.mp4',
    da: { ctaLabel: 'Shop nu', ctaUrl: 'https://shop.ab.dk' },
    en: { ctaLabel: 'Shop Now', ctaUrl: 'https://shop.ab.dk' },
  },
  {
    name: 'Tickets CTA',
    slideType: 'video',
    videoDa: 'public/videos/hero-tickets-da.mp4',
    videoEn: 'public/videos/hero-tickets-en.mp4',
    da: { ctaLabel: 'Køb billetter', ctaUrl: 'https://billet.ab.dk/' },
    en: { ctaLabel: 'Buy tickets', ctaUrl: 'https://billet.ab.dk/' },
  },
  {
    name: 'Join Team AB CTA',
    slideType: 'image',
    image: 'src/assets/images/join-team-ab-bg.png',
    da: {
      alt: 'Bliv en del af AB',
      headline: 'Bliv en del af AB.',
      subtitle: 'Meld dig ind og støt holdet',
      ctaLabel: 'Meld dig ind',
      ctaUrl: '/om/bliv-medlem',
    },
    en: {
      alt: 'Join AB',
      headline: 'Join the family.',
      subtitle: 'Become a member and support the club',
      ctaLabel: 'Join now',
      ctaUrl: '/en/om/bliv-medlem',
    },
  },
];

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${STRAPI_API_TOKEN}`, ...extra };
}

async function strapiJson(pathname, options = {}) {
  const res = await fetch(`${STRAPI_URL}${pathname}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...options.headers,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${pathname} -> ${res.status} ${await res.text()}`
    );
  }
  return res.status === 204 ? null : res.json();
}

async function uploadFile(relativePath) {
  const filePath = path.join(ROOT_DIR, relativePath);
  const bytes = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const form = new FormData();
  form.append(
    'files',
    new Blob([bytes], { type: MIME_TYPES[ext] ?? 'application/octet-stream' }),
    path.basename(filePath)
  );

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    throw new Error(
      `upload ${relativePath} -> ${res.status} ${await res.text()}`
    );
  }
  const [uploaded] = await res.json();
  return uploaded.id;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `status=draft` (not `published`) — every document has a draft version, but
// not necessarily a published one, so this is the only status filter
// guaranteed to find a document regardless of whether an earlier run
// created it but failed before publishing.
async function findExistingDocumentId(name) {
  const res = await strapiJson(
    `/api/hero-slides?filters[name][$eq]=${encodeURIComponent(name)}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

function buildData(slide, localeKey, sortOrder, imageId, videoId) {
  const strings = slide[localeKey];
  return {
    name: slide.name,
    slideType: slide.slideType,
    sortOrder,
    ctaVariant: 'btn-beige',
    ctaLabel: strings.ctaLabel,
    ctaUrl: strings.ctaUrl,
    ...(imageId && { image: imageId }),
    ...(videoId && { video: videoId }),
    ...(strings.alt && { alt: strings.alt }),
    ...(strings.headline && { headline: strings.headline }),
    ...(strings.subtitle && { subtitle: strings.subtitle }),
  };
}

async function seedOne(slide, sortOrder) {
  console.log(`\n${slide.name}`);

  // `image` is non-localized — uploaded once and reused across both locale writes.
  const imageId = slide.image ? await uploadFile(slide.image) : null;
  if (imageId) console.log(`  uploaded image (media id ${imageId})`);

  // `video` is localized (da/en clips differ) — uploaded separately per locale.
  const videoIdDa = slide.videoDa ? await uploadFile(slide.videoDa) : null;
  const videoIdEn = slide.videoEn ? await uploadFile(slide.videoEn) : null;
  if (videoIdDa) console.log(`  uploaded da video (media id ${videoIdDa})`);
  if (videoIdEn) console.log(`  uploaded en video (media id ${videoIdEn})`);

  const daData = buildData(slide, 'da', sortOrder, imageId, videoIdDa);
  const enData = buildData(slide, 'en', sortOrder, imageId, videoIdEn);

  const existingId = await findExistingDocumentId(slide.name);

  // `status=published` on the write itself both creates/updates AND publishes
  // in one call — Strapi's public content-api (token-auth) routes don't expose
  // the content-manager's /actions/publish endpoint (that's admin-session-only).
  let documentId;
  if (existingId) {
    await strapiJson(
      `/api/hero-slides/${existingId}?locale=da&status=published`,
      {
        method: 'PUT',
        body: JSON.stringify({ data: daData }),
      }
    );
    documentId = existingId;
    console.log(`  updated existing entry (${documentId})`);
  } else {
    const created = await strapiJson(
      '/api/hero-slides?locale=da&status=published',
      {
        method: 'POST',
        body: JSON.stringify({ data: daData }),
      }
    );
    documentId = created.data.documentId;
    console.log(`  created new entry (${documentId})`);
  }

  await strapiJson(
    `/api/hero-slides/${documentId}?locale=en&status=published`,
    {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    }
  );
  console.log('  synced en locale');
}

let ok = 0;
let failed = 0;
for (const [index, slide] of HERO_SLIDES.entries()) {
  try {
    await seedOne(slide, index * 10);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  // Strapi Cloud's sandbox tier can 503 under back-to-back multipart uploads
  // (seen with seed-partners.mjs) — a short pause between slides avoids that,
  // which matters more here given the larger video payloads.
  await sleep(1000);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
