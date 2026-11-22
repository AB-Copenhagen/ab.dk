#!/usr/bin/env node
// One-off migration: pushes the 8 ABTV videos currently hardcoded in
// src/pages/abtv.astro (and duplicated near-verbatim in src/pages/en/abtv.astro)
// into Strapi's new `abtv-video` content type, so the page switches from a
// hardcoded list to fetchAbtvVideos() without losing content. All 8 are
// genuinely public YouTube channel content, so every row seeds as `free`
// tier — gating a real Plus/Premium video is an editorial change made later
// directly in Strapi admin, not something this script needs to anticipate.
//
// `abtv-video` is NOT a localized content type (like Venue) — one row per
// video, with captionDa/captionEn as plain fields. Captions below are copied
// as-is from the current hardcoded pages, where da/en already show the same
// caption text for every one of these 8 videos.
//
// Idempotent: upserts by `youtubeId`, so it's safe to re-run.
//
// Usage: node --env-file=.env.local scripts/seed-abtv-videos.mjs
//   (requires STRAPI_URL and a write-scoped STRAPI_API_TOKEN in .env.local)

const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/$/,
  ''
);
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error(
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-abtv-videos.mjs'
  );
  process.exit(1);
}

const ABTV_VIDEOS = [
  // Nyt & Trending / New & Trending
  {
    caption: 'Boldcast',
    youtubeId: 'PLI_1pixkexw71QCbHe4gxmj_CItaFUQCO',
    isPlaylist: true,
    section: 'trending',
  },
  {
    caption: 'AB Squad Stories',
    youtubeId: 'PLI_1pixkexw7XCJKP94KNezrHAPG5dai_',
    isPlaylist: true,
    section: 'trending',
  },
  // Genoplev sæsonen / Relive the Season
  {
    caption: "Inside AB's Historic Season",
    youtubeId: 'RBpLV4HiS9E',
    isPlaylist: false,
    section: 'season',
  },
  {
    caption: 'A Season to Remember',
    youtubeId: 'YroeMSqcppo',
    isPlaylist: false,
    section: 'season',
  },
  {
    caption: 'Nummer Et',
    youtubeId: 'vsXpLavqXGQ',
    isPlaylist: false,
    section: 'season',
  },
  {
    caption: "We Know What We're Playing For",
    youtubeId: 'lCwpCNwcNis',
    isPlaylist: false,
    section: 'season',
  },
  // Bag om kulisserne / Behind the Scenes
  {
    caption: 'Interviews',
    youtubeId: 'PLI_1pixkexw7_joKCyMFcAWOTE-mEEclp',
    isPlaylist: true,
    section: 'behind_the_scenes',
  },
  {
    caption: 'Quick Fire',
    youtubeId: 'PLI_1pixkexw7QHBoCnYbf1QRv8LaaBDtB',
    isPlaylist: true,
    section: 'behind_the_scenes',
  },
];

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `status=draft` — every document has a draft version, but not necessarily a
// published one, so this is the only status filter guaranteed to find a
// document regardless of whether an earlier run created it but failed before
// publishing.
async function findExistingDocumentId(youtubeId) {
  const res = await strapiJson(
    `/api/abtv-videos?filters[youtubeId][$eq]=${encodeURIComponent(youtubeId)}&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

function buildData(video, sortOrder) {
  return {
    captionDa: video.caption,
    captionEn: video.caption,
    youtubeId: video.youtubeId,
    isPlaylist: video.isPlaylist,
    section: video.section,
    requiredTier: 'free',
    sortOrder,
    hidden: false,
  };
}

async function seedOne(video, sortOrder) {
  console.log(`\n${video.caption} (${video.youtubeId})`);
  const data = buildData(video, sortOrder);
  const existingId = await findExistingDocumentId(video.youtubeId);

  // `status=published` on the write itself both creates/updates AND publishes
  // in one call — Strapi's public content-api (token-auth) routes don't expose
  // the content-manager's /actions/publish endpoint (that's admin-session-only).
  if (existingId) {
    await strapiJson(`/api/abtv-videos/${existingId}?status=published`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    console.log(`  updated existing entry (${existingId})`);
  } else {
    const created = await strapiJson('/api/abtv-videos?status=published', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    console.log(`  created new entry (${created.data.documentId})`);
  }
}

let ok = 0;
let failed = 0;
const sortOrderBySection = new Map();
for (const video of ABTV_VIDEOS) {
  const sortOrder = sortOrderBySection.get(video.section) ?? 0;
  try {
    await seedOne(video, sortOrder);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  sortOrderBySection.set(video.section, sortOrder + 10);
  await sleep(300);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
