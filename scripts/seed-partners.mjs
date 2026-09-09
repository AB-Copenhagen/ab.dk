#!/usr/bin/env node
// One-off migration: pushes the partners currently hardcoded in src/data/partners.ts
// (captured below, since that file is being trimmed down to just PartnerTier/TIER_LABELS
// once the CMS is the source of truth) into Strapi, so the Partners pages don't lose
// content when they switch from static data to fetchPartners()/fetchPartnerBySlug().
//
// Idempotent: upserts by `name`, so it's safe to re-run (e.g. after fixing a logo path).
// Leaves description/howLong/highlights/keyContacts empty — that content doesn't exist
// yet and needs to be written by hand in Strapi admin.
//
// Usage: node --env-file=.env.local scripts/seed-partners.mjs
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
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-partners.mjs'
  );
  process.exit(1);
}

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
const PLACEHOLDER_LOGO = '/images/sponsors/partner-logo-placeholder.svg';

// Captured from src/data/partners.ts before it was trimmed to CMS-only tier labels.
const PARTNERS = [
  {
    slug: 'datum',
    name: 'Datum',
    logo: '/images/sponsors/datum.png',
    logoWidth: 300,
    logoHeight: 100,
    website: 'https://datum.net/',
    category: 'supreme',
  },
  {
    slug: 'myriad360',
    name: 'Myriad 360',
    logo: '/images/sponsors/myriad360.png',
    logoWidth: 230,
    logoHeight: 51,
    website: 'https://myriad360.com/',
    category: 'supreme',
  },
  {
    slug: 'select',
    name: 'Select',
    logo: '/images/sponsors/select-sport.png',
    website: 'https://dk.select-sport.com/',
    category: 'premium',
  },
  {
    slug: 'unisport',
    name: 'Unisport',
    logo: '/images/sponsors/unisport.png',
    category: 'premium',
  },
  {
    slug: 'lind',
    name: 'LIND',
    logo: '/images/sponsors/lind-law.png',
    website: 'https://lindlaw.dk/',
    category: 'premium',
  },
  {
    slug: 'ambrosia-group',
    name: 'Ambrosia Group',
    logo: PLACEHOLDER_LOGO,
    category: 'premium',
  },
  {
    slug: 'dagrofa',
    name: 'Dagrofa',
    logo: PLACEHOLDER_LOGO,
    category: 'premium',
  },
  {
    slug: 'hagelund',
    name: 'Hagelund ApS',
    logo: '/images/sponsors/partners/hagelund.png',
    category: 'local-hero',
  },
  {
    slug: 'dancontainer',
    name: 'Dancontainer',
    logo: '/images/sponsors/partners/dancontainer.jpg',
    category: 'local-hero',
  },
  {
    slug: 'bagerdygtigt',
    name: 'Bagerdygtigt ApS',
    logo: PLACEHOLDER_LOGO,
    category: 'ab1889',
  },
  { slug: 'dva', name: 'DVA', logo: PLACEHOLDER_LOGO, category: 'ab1889' },
  {
    slug: 'epact',
    name: 'ePact',
    logo: '/images/sponsors/partners/epact.png',
    category: 'ab1889',
  },
  {
    slug: 'sds-rengoering',
    name: 'SDS Rengøring ApS',
    logo: PLACEHOLDER_LOGO,
    category: 'ab1889',
  },
  {
    slug: 'plus-leasing',
    name: 'Plus Leasing',
    logo: '/images/sponsors/partners/plus-leasing.png',
    category: 'ab1889',
  },
  {
    slug: 'travel-4-companies',
    name: 'Travel 4 Companies A/S',
    logo: '/images/sponsors/partners/t4c.jpg',
    category: 'ab1889',
  },
  {
    slug: 'weibel-e',
    name: 'Weibel E',
    logo: '/images/sponsors/partners/weibel-el-teknik.png',
    category: 'ab1889',
  },
  {
    slug: 'weibel-data',
    name: 'Weibel Data',
    logo: '/images/sponsors/partners/weibel-data.png',
    category: 'ab1889',
  },
];

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
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

async function uploadLogo(logoPath) {
  const filePath = path.join(PUBLIC_DIR, logoPath.replace(/^\//, ''));
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
    throw new Error(`upload ${logoPath} -> ${res.status} ${await res.text()}`);
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
    `/api/partners?filters[name][$eq]=${encodeURIComponent(name)}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

async function seedOne(partner, sortOrder) {
  console.log(`\n${partner.name}`);

  const logoId = await uploadLogo(partner.logo);
  console.log(`  uploaded logo (media id ${logoId})`);

  const data = {
    name: partner.name,
    slug: partner.slug,
    logo: logoId,
    url: partner.website,
    category: partner.category,
    sortOrder,
    ...(partner.logoWidth && { logoWidth: partner.logoWidth }),
    ...(partner.logoHeight && { logoHeight: partner.logoHeight }),
  };

  const existingId = await findExistingDocumentId(partner.name);

  // `status=published` on the write itself both creates/updates AND publishes
  // in one call — Strapi's public content-api (token-auth) routes don't expose
  // the content-manager's /actions/publish endpoint (that's admin-session-only).
  let documentId;
  if (existingId) {
    await strapiJson(`/api/partners/${existingId}?locale=da&status=published`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    documentId = existingId;
    console.log(`  updated existing entry (${documentId})`);
  } else {
    const created = await strapiJson(
      '/api/partners?locale=da&status=published',
      {
        method: 'POST',
        body: JSON.stringify({ data }),
      }
    );
    documentId = created.data.documentId;
    console.log(`  created new entry (${documentId})`);
  }

  // Create/refresh the EN locale row so the partner shows up on the English
  // site too — non-localized fields (logo, url, category, etc.) carry over,
  // description/howLong/highlights are left for manual translation later.
  await strapiJson(`/api/partners/${documentId}?locale=en&status=published`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  console.log('  synced en locale');
}

let ok = 0;
let failed = 0;
for (const [index, partner] of PARTNERS.entries()) {
  try {
    await seedOne(partner, index * 10);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  // Strapi Cloud's sandbox tier choked under back-to-back multipart uploads
  // during an earlier run (503s from Dancontainer onward) — a short pause
  // between partners keeps this from happening again.
  await sleep(1000);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
