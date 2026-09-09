#!/usr/bin/env node
// One-off migration: pushes the board/exec/sporting members and investors
// currently hardcoded in src/pages/en/about/leadership.astro and
// src/pages/om/ledelse.astro (captured below, since those pages are being
// switched to fetchLeadership()/fetchInvestors()) into Strapi.
//
// Idempotent: upserts leadership members by `name`+`section` (the same person
// can appear in more than one section, e.g. Brian Grieco is both a board
// member and the exec chairman, with a different role/bio each time) and
// investors by `name`. Safe to re-run.
//
// Sofie Brandi Petersen's and Fannar Berg Gunnólfsson's photos could not be
// re-fetched from their old ab.dk WordPress URLs (the new site 403s the
// Photon/i0.wp.com proxy that used to serve them) — the user supplied both
// photos directly, saved locally as sofie-brandi-petersen.jpg and
// fannar-berg-gunnolfsson.jpg.
//
// Usage: node --env-file=.env.local scripts/seed-leadership.mjs
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
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-leadership.mjs'
  );
  process.exit(1);
}

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

// Captured from src/pages/en/about/leadership.astro + src/pages/om/ledelse.astro.
const LEADERSHIP_MEMBERS = [
  // ── Board of Directors ──────────────────────────────────────────────────
  {
    name: 'Brian Grieco',
    section: 'board',
    photo: '/images/team/brian-grieco.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Member',
      bio: 'Brian has been a board member since August 2024. Brian is a business-focused lawyer and a partner at a New York law firm, and focuses his legal practice on general corporate and commercial law, debtor and creditor rights, and commercial litigation. He began his legal career as a financial restructuring lawyer and has advised businesses his entire career on all types of legal matters, including with respect to business start up, capital raises, and corporate governance. Brian has also spent time with the US Securities and Exchange Commission and in various roles in the financial industry, on both the legal and business side.',
    },
    da: {
      role: 'Bestyrelsesmedlem',
      bio: 'Brian har været bestyrelsesmedlem siden august 2024. Brian er en forretningsorienteret advokat og partner hos et advokatfirma i New York, hvor han beskæftiger sig med generel selskabs- og handelsret, kreditor- og debitorrettigheder samt kommerciel retssagsbehandling. Han startede sin juridiske karriere som advokat inden for finansiel restrukturering og har gennem hele sin karriere rådgivet virksomheder om alle typer juridiske forhold, herunder virksomhedsopstart, kapitalrejsning og corporate governance. Brian har desuden arbejdet for det amerikanske Securities and Exchange Commission samt i forskellige roller i finansindustrien, både på den juridiske og forretningsmæssige side.',
    },
  },
  {
    name: 'Jen Chang',
    section: 'board',
    photo: '/images/team/jen-chang.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Member',
      bio: "Jen has been a board member since November 2022. Prior to AB, Jen worked for 12 years as a scout and in talent identification for various first- and second-tier European football teams. Previously, he also worked in the finance and media industries. He holds an M.Phil in International Relations from Queens' College, University of Cambridge, an MSc in Industrial Relations from the London School of Economics, and a BA (Hons) in History from Queen Mary University of London.",
    },
    da: {
      role: 'Bestyrelsesmedlem',
      bio: "Jen har været bestyrelsesmedlem siden november 2022. Forud for AB arbejdede Jen i 12 år som scout og med talentidentifikation for forskellige første- og andetdivisionsklubber i europæisk fodbold. Han har tidligere også arbejdet i finans- og mediebranchen. Han har en M.Phil i International Relations fra Queens' College, University of Cambridge, en MSc i Industrial Relations fra London School of Economics og en BA (Hons) i History fra Queen Mary University of London.",
    },
  },
  {
    name: 'Zachary Smith',
    section: 'board',
    photo: '/images/team/zac-smith.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Member',
      bio: 'Zachary is an entrepreneur in the digital infrastructure and cloud computing industry. In 2014, he co-founded Packet, which became the leader in bare metal automation and was acquired by Equinix in 2020. In late 2024, Mr. Smith co-founded Datum, a startup on a mission to provide internet-scale capabilities to every builder, backed by Amplify, Encoded, and CRV.',
    },
    da: {
      role: 'Bestyrelsesmedlem',
      bio: 'Zachary er iværksætter inden for digital infrastruktur og cloud computing. Han grundlagde i 2014 Packet, der blev markedsleder inden for bare metal-automatisering og opkøbt af Equinix i 2020. I slutningen af 2024 medstiftede han Datum, støttet af Amplify, Encoded og CRV.',
    },
  },
  {
    name: 'Ben Lyttleton',
    section: 'board',
    photo: '/images/team/ben-lyttleton.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Member',
      bio: 'Ben Lyttleton is an AB board member, best-selling author, and keynote speaker on the psychology of high performance. His book Twelve Yards: The Art and Psychology of the Perfect Penalty (2014) helped England win its first World Cup penalty shoot-out. His Football School series has sold over one million copies in the UK, and he created a football-based school curriculum used in over 100 countries.',
    },
    da: {
      role: 'Bestyrelsesmedlem',
      bio: 'Ben Lyttleton er bestyrelsesmedlem i AB, bestsellerforfatter og keynote speaker om psykologien bag høj præstation. Hans bog Twelve Yards (2014) bidrog til Englands første World Cup-straffesparksgevinst. Hans Football School-bøger er solgt i over én million eksemplarer i Storbritannien.',
    },
  },
  {
    name: 'Harrison Oellrich',
    section: 'board',
    photo: '/images/team/harrison-oellrich.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Advisor',
      bio: 'Harrison has been a board observer since 2023. He formally retired as managing director of a pre-eminent risk management and financial services firm in 2010 after a 30+ year career there to concentrate on various non-profit and humanitarian projects. He also founded his own consultancy to leverage the knowledge and expertise of the risk management community for the benefit of the public, private, and non-profit sectors, and has been instrumental in founding and building out several non-profits that now serve in over 25 countries worldwide. He also serves as a deacon at several local congregations.',
    },
    da: {
      role: 'Bestyrelsesrådgiver',
      bio: 'Harrison har været bestyrelsesobservatør siden 2023. Han gik officielt på pension som administrerende direktør for et førende risikostyrings- og finansielt servicefirma i 2010 efter en karriere på over 30 år, for at fokusere på forskellige nonprofit- og humanitære projekter. Han har desuden grundlagt sit eget konsulentfirma for at bringe risikostyringsbranchens viden og ekspertise til gavn for den offentlige, private og nonprofit sektor, og har været instrumental i at grundlægge og opbygge flere nonprofitorganisationer, der i dag er aktive i over 25 lande verden over. Han er desuden diakon i flere lokale kirker.',
    },
  },
  {
    name: 'Joseph Gordon',
    section: 'board',
    photo: '/images/team/joseph-gordon.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Board Member',
      bio: 'Joe has been a board member since November 2022. Joe Gordon is the founder of UpFor Consulting, a sales and growth focused consultancy group. UpFor works with both emerging and established companies to create, hone, and master their business development strategies and communications skills, build teams and company culture, and lead through growth and change. Previously, Joe spent 19 years in the legal services space, the last 13 of which included managing and leading the organization through exponential growth and eventual acquisition as its Global VP of Sales. Joe holds a BA from American University in Law and Society and an MS in Industrial and Organizational Psychology from Baruch College.',
    },
    da: {
      role: 'Bestyrelsesmedlem',
      bio: 'Joe har været bestyrelsesmedlem siden november 2022. Joe Gordon er grundlægger af UpFor Consulting, et konsulenthus med fokus på salg og vækst. UpFor arbejder med både nye og etablerede virksomheder om at skabe og finpudse deres forretningsudviklingsstrategier og kommunikationsevner, opbygge teams og virksomhedskultur samt lede gennem vækst og forandring. Joe tilbragte tidligere 19 år i branchen for juridiske ydelser, hvoraf de sidste 13 år bestod af at lede organisationen gennem eksponentiel vækst og et efterfølgende opkøb som Global VP of Sales. Joe har en bachelorgrad fra American University i Law and Society og en mastergrad i Industrial and Organizational Psychology fra Baruch College.',
    },
  },
  {
    name: 'Sofie Brandi Petersen',
    section: 'board',
    photo: '/images/team/sofie-brandi-petersen.jpg',
    photoPosition: 'object-top',
    en: { role: 'Advisor', bio: null },
    da: { role: 'Rådgiver', bio: null },
  },

  // ── Executive Team ───────────────────────────────────────────────────────
  {
    name: 'Brian Grieco',
    section: 'exec',
    photo: '/images/team/brian-grieco.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Chairman',
      bio: "Brian serves AB A/S as its Chairman and operates as its General Counsel. In these roles, Brian oversees the management of the business, with a focus on the club's governance and contractual relationships. Brian is also the club's contact with various stakeholders, including the mother club and local governments. Brian also manages various aspects of the club's financial operations and compliance.",
    },
    da: {
      role: 'Bestyrelsesformand',
      bio: 'Brian er bestyrelsesformand i AB A/S og fungerer desuden som General Counsel. I disse roller overvåger Brian ledelsen af forretningen med fokus på klubbens governance og kontraktuelle forhold. Brian er desuden klubbens kontaktperson over for forskellige interessenter, herunder moderklubben og lokale myndigheder. Brian varetager også forskellige aspekter af klubbens finansielle drift og compliance.',
    },
  },
  {
    name: 'Henrik Bom',
    section: 'exec',
    photo: '/images/team/henrik-bom.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'President',
      bio: "Henrik Bom leads the club's business operations and long-term development. With more than 25 years of international leadership experience across Denmark and the United States, Henrik brings a strong commercial and operational background to one of Denmark's oldest football clubs. Under his leadership, AB is focused on creating exceptional experiences for fans while strengthening the club's role in the local community and expanding its international network.",
    },
    da: {
      role: 'President',
      bio: 'Henrik Bom leder klubbens forretningsdrift og langsigtede udvikling. Med mere end 25 års international ledelseserfaring fra Danmark og USA bringer Henrik en stærk kommerciel og operationel baggrund til en af Danmarks ældste fodboldklubber. Under hans ledelse fokuserer AB på at skabe exceptionelle oplevelser for fans, samtidig med at klubbens rolle i lokalsamfundet styrkes og det internationale netværk udvides.',
    },
  },
  {
    name: 'Cynthia Lee',
    section: 'exec',
    photo: '/images/team/cynthia-lee.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Marketing & Brand',
      bio: 'Cynthia runs Marketing and Brand for the club. A specialist in integrated marketing, strategic partnerships, and brand storytelling, she has launched product campaigns and experiential activations across digital, social, television, live events, and branded entertainment. Passionate about innovation and collaboration, Cynthia creates marketing strategies that strengthen brands, drive engagement, and deliver measurable business impact. She has a BA from Miami University and an MA from The Ohio State University.',
    },
    da: {
      role: 'Marketing & Brand',
      bio: 'Cynthia driver Marketing og Brand for klubben. Som specialist i integreret marketing, strategiske partnerskaber og brand storytelling har hun lanceret produktkampagner og oplevelsesbaserede aktiveringer inden for digitalt, sociale medier, tv, live events og branded entertainment. Med en passion for innovation og samarbejde skaber Cynthia marketingstrategier, der styrker brands, driver engagement og leverer målbar forretningsmæssig effekt. Hun har en bachelorgrad fra Miami University og en mastergrad fra The Ohio State University.',
    },
  },
  {
    name: 'Jen Chang',
    section: 'exec',
    photo: '/images/team/jen-chang.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Sporting Director',
      bio: "Jen is currently the AB sporting director. Prior to AB, Jen worked for 12 years as a scout and in talent identification for various first- and second-tier European football teams. Previously, he also worked in the finance and media industries. He holds an M.Phil in International Relations from Queens' College, University of Cambridge, an MSc in Industrial Relations from the London School of Economics, and a BA (Hons) in History from Queen Mary University of London.",
    },
    da: {
      role: 'Sportslig direktør',
      bio: "Jen er sportslig direktør i AB. Forud for AB arbejdede Jen i 12 år som scout og med talentidentifikation for forskellige første- og andetdivisionsklubber i europæisk fodbold. Han har tidligere også arbejdet i finans- og mediebranchen. Han har en M.Phil i International Relations fra Queens' College, University of Cambridge, en MSc i Industrial Relations fra London School of Economics og en BA (Hons) i History fra Queen Mary University of London.",
    },
  },
  {
    name: 'Simon Taylor',
    section: 'exec',
    photo: '/images/team/simon-taylor.jpg',
    photoPosition: 'object-center',
    en: { role: 'Partnerships', bio: null },
    da: { role: 'Partnerskaber', bio: null },
  },
  {
    name: 'Rasmus Granzow',
    section: 'exec',
    photo: '/images/team/rasmus-granzow.jpg',
    photoPosition: 'object-center',
    en: {
      role: 'Hospitality & Event Manager',
      bio: "Working at AB since the beginning of 2025, Rasmus is AB's hospitality and events manager. He has a strong background in the hotel & service industry with over 12 years of experience. Passionate about creating memorable guest experiences, Rasmus specializes in delivering premium fan and VIP experiences, managing events, and developing hospitality concepts that enhance engagement and drive commercial growth. He has a Bachelor's degree in Innovation & Entrepreneurship, and enjoys developing new ideas, challenging the status quo, and creating innovative solutions that improve both the customer experience and business performance.",
    },
    da: {
      role: 'Hospitality & Event Manager',
      bio: 'Rasmus har arbejdet i AB siden starten af 2025 som klubbens hospitality- og eventmanager. Han har en stærk baggrund fra hotel- og serviceindustrien med over 12 års erfaring. Med en passion for at skabe mindeværdige gæsteoplevelser er Rasmus specialiseret i at levere premium fan- og VIP-oplevelser, styre events og udvikle hospitality-koncepter, der øger engagementet og driver kommerciel vækst. Han har en bachelorgrad i Innovation & Entrepreneurship og nyder at udvikle nye idéer, udfordre status quo og skabe innovative løsninger, der forbedrer både kundeoplevelsen og forretningsresultaterne.',
    },
  },

  // ── Sporting Leadership ──────────────────────────────────────────────────
  {
    name: 'Fannar Berg Gunnólfsson',
    section: 'sporting',
    photo: '/images/team/fannar-berg-gunnolfsson.jpg',
    photoPosition: 'object-top',
    en: {
      role: 'Head Coach',
      bio: 'Gunnólfsson has experience from both senior and youth football in Iceland and Norway. Prior to AB, he was most recently head coach of Volde Turn and Idrottslag and assistant coach of Knattspyrnufélag ÍA.',
    },
    da: {
      role: 'Cheftræner',
      bio: 'Gunnólfsson har erfaring fra senior- og ungdomsfodbold på Island og i Norge. Senest var han cheftræner i Volde Turn og Idrottslag og assistenttræner i Knattspyrnufélag ÍA.',
    },
  },
  {
    name: 'Joakim Sternas',
    section: 'sporting',
    photo: '/images/team/joakim-sternas.png',
    photoPosition: 'object-top',
    en: {
      role: 'Goalkeeper Coach',
      bio: 'Prior to AB, Sternas was head goalkeeper coach at Täby FK in the Swedish Ettan Norra for two years. He started his coaching career with Spånga IS FK.',
    },
    da: {
      role: 'Målmandstræner',
      bio: 'Sternas var målmandstræner i Täby FK i den svenske Ettan Norra i to år inden AB. Han startede sin trænerbane i Spånga IS FK.',
    },
  },
  {
    name: 'Konstantinos Ntolaptsis',
    section: 'sporting',
    photo: '/images/team/konstantinos-ntolaptsis.png',
    photoPosition: 'object-top',
    en: {
      role: 'Strength & Conditioning',
      bio: "Ntolaptsis joined AB in July 2025. He holds a Master's in Exercise Science & Training from Julius-Maximilians University Würzburg and a Bachelor of Sport Science from Aristotle University of Thessaloniki.",
    },
    da: {
      role: 'Styrke & Kondition',
      bio: 'Ntolaptsis tiltrådte i AB i juli 2025 fra FV Wurzburger U19. Han har en kandidatgrad i Exercise Science & Training fra Julius-Maximilians Universität Würzburg.',
    },
  },
];

const INVESTORS = [
  {
    name: 'Five Castles Football Group',
    since: 'November 2022',
    en: {
      stake: 'Majority owner',
      description:
        'The American investor group that acquired 95% of AB in November 2022, with a vision to revamp commercial operations, modernise player recruitment and scouting, and establish a clear playing identity.',
    },
    da: {
      stake: 'Majoritetsaktionær',
      description:
        'Den amerikanske investorgruppe, der erhvervede 95% af AB i november 2022, med en vision om at opgradere kommercielle aktiviteter, modernisere spillerrekruttering og scouting samt etablere en klar spilleidentitet.',
    },
  },
  {
    name: 'Green Owls Football Holdings',
    since: 'April 2025',
    en: {
      stake: '25% minority shareholder',
      description:
        "Green Owls became a minority shareholder in April 2025. The investment supports the club's mission by strengthening the squad, enhancing the fan experience, expanding sponsor partnerships, and deepening community outreach.",
    },
    da: {
      stake: '25% minoritetsaktionær',
      description:
        'Green Owls blev minoritetsaktionær i april 2025. Investeringen understøtter klubbens mission ved at styrke truppen, forbedre fanoplevelsen, udvide sponsorpartnerskaber og uddybe lokalt engagement.',
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

// Cached by local path so a photo shared across sections (e.g. Brian Grieco's
// board + exec entries) is only uploaded to Strapi's media library once.
const uploadedPhotoIds = new Map();

async function uploadPhoto(photoPath) {
  if (!photoPath) return null;
  if (uploadedPhotoIds.has(photoPath)) return uploadedPhotoIds.get(photoPath);

  const filePath = path.join(PUBLIC_DIR, photoPath.replace(/^\//, ''));
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
    throw new Error(`upload ${photoPath} -> ${res.status} ${await res.text()}`);
  }
  const [uploaded] = await res.json();
  uploadedPhotoIds.set(photoPath, uploaded.id);
  return uploaded.id;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `status=draft` (not `published`) — every document has a draft version, but
// not necessarily a published one, so this is the only status filter
// guaranteed to find a document regardless of whether an earlier run
// created it but failed before publishing.
async function findExistingLeadershipMemberId(name, section) {
  const res = await strapiJson(
    `/api/leadership-members?filters[name][$eq]=${encodeURIComponent(name)}&filters[section][$eq]=${section}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

async function findExistingInvestorId(name) {
  const res = await strapiJson(
    `/api/investors?filters[name][$eq]=${encodeURIComponent(name)}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

// `status=published` on the write itself both creates/updates AND publishes
// in one call — Strapi's public content-api (token-auth) routes don't expose
// the content-manager's /actions/publish endpoint (that's admin-session-only).
async function upsertLocalized(collection, existingId, daData, enData) {
  let documentId;
  if (existingId) {
    await strapiJson(
      `/api/${collection}/${existingId}?locale=da&status=published`,
      {
        method: 'PUT',
        body: JSON.stringify({ data: daData }),
      }
    );
    documentId = existingId;
  } else {
    const created = await strapiJson(
      `/api/${collection}?locale=da&status=published`,
      {
        method: 'POST',
        body: JSON.stringify({ data: daData }),
      }
    );
    documentId = created.data.documentId;
  }
  await strapiJson(
    `/api/${collection}/${documentId}?locale=en&status=published`,
    {
      method: 'PUT',
      body: JSON.stringify({ data: enData }),
    }
  );
  return documentId;
}

async function seedLeadershipMember(member, sortOrder) {
  console.log(`\n${member.name} (${member.section})`);

  const photoId = await uploadPhoto(member.photo);
  if (photoId) console.log(`  uploaded photo (media id ${photoId})`);
  else if (member.photo === null) console.log('  no photo (initials fallback)');

  const base = {
    name: member.name,
    section: member.section,
    photoPosition: member.photoPosition,
    sortOrder,
    ...(photoId && { photo: photoId }),
  };
  const daData = {
    ...base,
    role: member.da.role,
    ...(member.da.bio && { bio: member.da.bio }),
  };
  const enData = {
    ...base,
    role: member.en.role,
    ...(member.en.bio && { bio: member.en.bio }),
  };

  const existingId = await findExistingLeadershipMemberId(
    member.name,
    member.section
  );
  const documentId = await upsertLocalized(
    'leadership-members',
    existingId,
    daData,
    enData
  );
  console.log(`  ${existingId ? 'updated' : 'created'} entry (${documentId})`);
}

async function seedInvestor(investor, sortOrder) {
  console.log(`\n${investor.name}`);

  const base = { name: investor.name, since: investor.since, sortOrder };
  const daData = {
    ...base,
    stake: investor.da.stake,
    description: investor.da.description,
  };
  const enData = {
    ...base,
    stake: investor.en.stake,
    description: investor.en.description,
  };

  const existingId = await findExistingInvestorId(investor.name);
  const documentId = await upsertLocalized(
    'investors',
    existingId,
    daData,
    enData
  );
  console.log(`  ${existingId ? 'updated' : 'created'} entry (${documentId})`);
}

let ok = 0;
let failed = 0;

for (const [index, member] of LEADERSHIP_MEMBERS.entries()) {
  try {
    await seedLeadershipMember(member, index * 10);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  // Strapi Cloud's sandbox tier can 503 under back-to-back multipart uploads.
  await sleep(1000);
}

for (const [index, investor] of INVESTORS.entries()) {
  try {
    await seedInvestor(investor, index * 10);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  await sleep(1000);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
