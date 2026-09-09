#!/usr/bin/env node
// One-off migration: pushes the coaching staff roster currently hardcoded in
// src/data/coaching-staff.ts (captured below, since that file stays as a
// permanent per-record fallback rather than being trimmed — see AGENTS.md)
// into Strapi's `staff` content type.
//
// Idempotent: upserts by `slug`, so it's safe to re-run.
// Leaves `photo` unset — today's COACHING_STAFF photo values are proxy URLs
// into Wasabi (`/api/media/players/{slug}.png`), not local files under
// public/ the way partner logos were, so there's nothing to upload from here.
// Editors re-upload each staffer's existing photo into Strapi's Media Library
// once, by hand, after this seed runs.
//
// Usage: node --env-file=.env.local scripts/seed-staff-members.mjs
//   (requires STRAPI_URL and a write-scoped STRAPI_API_TOKEN in .env.local)
const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/$/,
  ''
);
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error(
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-staff-members.mjs'
  );
  process.exit(1);
}

// Captured from src/data/coaching-staff.ts's COACHING_STAFF.
const STAFF = [
  {
    slug: 'fannar-berg-gunnolfsson',
    name: 'Fannar Berg Gunnólfsson',
    role: { da: 'Cheftræner', en: 'Head Coach' },
    nationality: { da: 'Islandsk', en: 'Icelandic' },
    bio: {
      en: 'Berg Gunnólfsson was hired as head coach of AB on November 15, 2025. Prior to his appointment, he was an assistant coach at AB. Additionally, he has experience from both senior and youth football in Iceland and Norway. Before AB, he was head coach for Volde Turn og Idrottslag and assistant coach for Knattspyrnufélag ÍA.',
      da: 'Berg Gunnólfsson blev ansat som cheftræner for AB den 15. november 2025. Forud for sin ansættelse var han assistenttræner i AB. Derudover har han erfaring fra både senior- og ungdomsfodbold i Island og Norge. Inden AB var han cheftræner for Volde Turn og Idrottslag og assistenttræner for Knattspyrnufélag ÍA.',
    },
  },
  {
    slug: 'benjamin-chor',
    name: 'Benjamin Chor',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Dansk', en: 'Danish' },
    bio: {
      en: "Benjamin Chor has over 10 years of coaching experience and was most recently assistant coach at Fremad Amager from March 2024 to March 2025. He worked as an academy coach at FK Bodø/Glimt in Norway between 2022–2024 and was also head coach for Brøndby's U13 team from 2020–21.",
      da: 'Benjamin Chor har over 10 års trænerfaring og var senest assistenttræner i Fremad Amager fra marts 2024 til marts 2025. Han arbejdede som akademitræner i FK Bodø/Glimt i Norge i perioden 2022–2024 og var desuden cheftræner for Brøndbys U13-hold i 2020–21.',
    },
  },
  {
    slug: 'jussi-kontinen',
    name: 'Jussi Kontinen',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Svensk, Finsk', en: 'Swedish, Finnish' },
    bio: {
      en: 'Jussi Kontinen has a UEFA Pro license and over 20 years of coaching experience. He was most recently head coach for Lunds BK in the Swedish Division 1 Södra from 2022–25. In the 2021 season, he was assistant coach in the Allsvenskan for Östersunds FK and also has previous experience as an academy coach at IFK Göteborg.',
      da: 'Jussi Kontinen har en UEFA Pro-licens og over 20 års trænerfaring. Han var senest cheftræner for Lunds BK i den svenske Division 1 Södra fra 2022–25. I sæsonen 2021 var han assistenttræner i Allsvenskan for Östersunds FK og har desuden erfaring som akademitræner i IFK Göteborg.',
    },
  },
  {
    slug: 'joakim-sternas',
    name: 'Joakim Sternas',
    role: { da: 'Målmandstræner', en: 'Goalkeeping Coach' },
    nationality: { da: 'Svensk', en: 'Swedish' },
    bio: {
      en: 'Sternas joined AB as goalkeeping coach after two years as head goalkeeping coach at Täby FK in the Swedish Ettan Norra. He started his coaching career at Spånga IS FK.',
      da: 'Sternas tiltrådte AB som målmandstræner efter to år som chefmålmandstræner i Täby FK i den svenske Ettan Norra. Han startede sin trænerbane i Spånga IS FK.',
    },
  },
  {
    slug: 'konstantinos-ntolaptsis',
    name: 'Konstantinos Ntolaptsis',
    role: { da: 'Fysisk træner', en: 'Fitness Coach' },
    nationality: { da: 'Græsk', en: 'Greek' },
    bio: {
      en: "Ntolaptsis is the fitness coach for the first team and joined AB in July 2025. He was previously a performance and fitness coach for FC Würzburger, where he worked with their U19 team. He holds a master's degree in Exercise Science & Training from Julius-Maximilians-University in Würzburg and a bachelor's degree in sports science from Aristotle University of Thessaloniki.",
      da: 'Ntolaptsis er første holds fysiske træner og tiltrådte AB i juli 2025. Han var tidligere performance- og fitness-coach for FC Würzburger, hvor han arbejdede med U19-holdet. Han har en kandidatgrad i Exercise Science & Training fra Julius-Maximilians-Universität i Würzburg og en bachelorgrad i sportvidenskab fra Aristoteles Universitetet i Thessaloniki.',
    },
  },
  {
    slug: 'andreas-sondergaard',
    name: 'Andreas Søndergaard',
    role: { da: 'Fysioterapeut', en: 'Physiotherapist' },
    nationality: { da: 'Dansk', en: 'Danish' },
    bio: {
      en: 'Søndergaard joined AB in April 2023 as head physio for the senior team, as well as working with the U19 and U17 Academy teams. Before that, he spent 10 seasons as head physio for the Copenhagen Towers in the Danish American Football league. During his time there, he was part of the team that secured 6 national championships and 1 Northern European Champions league title. He has also worked with both the Senior and U17 American football national teams.',
      da: 'Søndergaard kom til AB i april 2023 som cheffysioterapeut for førsteholdet samt for U19- og U17-akademiholdene. Forinden tilbragte han 10 sæsoner som cheffysioterapeut for Copenhagen Towers i den danske liga i american football. I den periode var han en del af holdet, der vandt 6 danske mesterskaber og 1 nordeuropæisk Champions League-titel. Han har desuden arbejdet med både senior- og U17-landsholdene i american football.',
    },
  },
  {
    slug: 'albert-kaarnoe',
    name: 'Albert Kaarnøe',
    role: { da: 'Fysioterapeut', en: 'Physiotherapist' },
    nationality: { da: 'Dansk', en: 'Danish' },
    bio: {
      en: 'Albert is a physiotherapy student at Copenhagen University College (Københavns Professionshøjskole), a sports enthusiast and someone who genuinely enjoys helping people feel stronger, move better and reach their goals. He is passionate about creating a positive environment where people feel supported and confident throughout their journey.',
      da: 'Albert er fysioterapistuderende ved Københavns Professionshøjskole, sportsentusiast og en, der oprigtigt nyder at hjælpe mennesker med at blive stærkere, bevæge sig bedre og nå deres mål. Han brænder for at skabe et positivt miljø, hvor mennesker føler sig støttet og trygge gennem hele deres forløb.',
    },
  },
  {
    slug: 'kim-villy-nielsen',
    name: 'Kim Villy Nielsen',
    role: { da: 'Materialemand', en: 'Kit Manager' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
  {
    slug: 'allan-petersen',
    name: 'Allan Petersen',
    role: { da: 'Materialemand', en: 'Kit Manager' },
    nationality: { da: 'Dansk', en: 'Danish' },
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

// `status=draft` — see seed-player-overrides.mjs for why draft (not published)
// is the reliable existence check.
async function findExistingDocumentId(slug) {
  const res = await strapiJson(
    `/api/staff-members?filters[slug][$eq]=${encodeURIComponent(slug)}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

async function seedOne(staff, sortOrder) {
  console.log(`\n${staff.name}`);

  const data = {
    slug: staff.slug,
    name: staff.name,
    role: staff.role.da,
    nationality: staff.nationality.da,
    ...(staff.bio?.da && { bio: staff.bio.da }),
    sortOrder,
    hidePhoto: false,
    hidden: false,
  };

  const existingId = await findExistingDocumentId(staff.slug);

  // `status=published` on the write itself both creates/updates AND publishes
  // in one call — see seed-player-overrides.mjs for why.
  let documentId;
  if (existingId) {
    await strapiJson(
      `/api/staff-members/${existingId}?locale=da&status=published`,
      { method: 'PUT', body: JSON.stringify({ data }) }
    );
    documentId = existingId;
    console.log(`  updated existing entry (${documentId})`);
  } else {
    const created = await strapiJson(
      '/api/staff-members?locale=da&status=published',
      { method: 'POST', body: JSON.stringify({ data }) }
    );
    documentId = created.data.documentId;
    console.log(`  created new entry (${documentId})`);
  }

  // Create/refresh the EN locale row — non-localized fields (slug, photo,
  // sortOrder, hidePhoto, hidden) carry over automatically; role/nationality/
  // bio need their own English text.
  await strapiJson(
    `/api/staff-members/${documentId}?locale=en&status=published`,
    {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          ...data,
          role: staff.role.en,
          nationality: staff.nationality.en,
          ...(staff.bio?.en && { bio: staff.bio.en }),
        },
      }),
    }
  );
  console.log('  synced en locale');
}

let ok = 0;
let failed = 0;
for (const [index, staff] of STAFF.entries()) {
  try {
    await seedOne(staff, index * 10);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  await sleep(500);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
