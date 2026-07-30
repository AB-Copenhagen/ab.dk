import { getPlayerSlug } from '@/data/player-cms-data';
import { fetchABEvents, fetchABPlayers } from '@/lib/si/client';
import {
  fetchCollectionTypeWithMeta,
  fetchPartners,
  fetchStaffRoster,
} from '@/lib/strapi/client';
import { escapeHtml } from '@/lib/utils';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  alternates?: { hreflang: string; href: string }[];
}

// Wasabi object key the daily cron job (src/pages/api/cron/sitemap.ts) writes
// to, and /sitemap.xml reads from on the hot path.
export const SITEMAP_STORAGE_KEY = 'sitemap/sitemap.xml';

// da/en URL pairs for statically-routed pages (mirrors src/lib/i18n.ts's slug map).
const STATIC_ROUTES: [string, string][] = [
  ['/', '/en'],
  ['/kampe', '/en/matches'],
  ['/truppen', '/en/squad'],
  ['/nyheder', '/en/news'],
  ['/om/historik', '/en/about/history'],
  ['/om/stadion', '/en/about/stadium'],
  ['/om/ledelse', '/en/about/leadership'],
  ['/faellesskab', '/en/community'],
  ['/brand', '/en/brand'],
  ['/kontakt', '/en/contact'],
  ['/partnere', '/en/partners'],
  ['/hospitality', '/en/hospitality'],
  ['/medier', '/en/media'],
  ['/events', '/en/events'],
  ['/products', '/en/products'],
  ['/kampdag', '/en/matchday'],
  ['/myab', '/en/myab'],
  ['/abtv', '/en/abtv'],
  ['/privatlivspolitik', '/en/privacy-policy'],
  ['/returpolitik', '/en/refund-and-returns-policy'],
];

// Strapi collections addressed by a plain `slug` field, fetched per-locale (locales are not
// assumed to share the same slug, so each is listed independently rather than paired).
const STRAPI_COLLECTIONS: {
  name: string;
  daPath: (slug: string) => string;
  enPath: (slug: string) => string;
}[] = [
  { name: 'pages', daPath: (s) => `/${s}`, enPath: (s) => `/en/${s}` },
  {
    name: 'articles',
    daPath: (s) => `/nyheder/${s}`,
    enPath: (s) => `/en/news/${s}`,
  },
  {
    name: 'products',
    daPath: (s) => `/products/${s}`,
    enPath: (s) => `/en/products/${s}`,
  },
];

type SlugItem = { slug: string; updatedAt?: string };

// Strapi caps pageSize at 100 per request, so collections larger than that (e.g. articles)
// need every page fetched — otherwise the sitemap silently truncates after the first 100.
async function fetchAllSlugs(
  collectionName: string,
  locale: 'da' | 'en'
): Promise<SlugItem[]> {
  const pageSize = 100;
  const items: SlugItem[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const result = await fetchCollectionTypeWithMeta<SlugItem[]>(
      collectionName,
      {
        locale,
        pagination: { page, pageSize },
      }
    );
    if (result.data.length === 0) break;
    items.push(...result.data);
    pageCount = result.pagination.pageCount;
    page++;
  } while (page <= pageCount);

  return items;
}

export async function buildSitemapEntries(
  site: string
): Promise<SitemapEntry[]> {
  const abs = (path: string) => `${site}${path}`;
  const entries: SitemapEntry[] = [];

  for (const [da, en] of STATIC_ROUTES) {
    const alternates = [
      { hreflang: 'da', href: abs(da) },
      { hreflang: 'en', href: abs(en) },
      { hreflang: 'x-default', href: abs(da) },
    ];
    entries.push({ loc: abs(da), alternates });
    entries.push({ loc: abs(en), alternates });
  }

  for (const col of STRAPI_COLLECTIONS) {
    for (const locale of ['da', 'en'] as const) {
      const items = await fetchAllSlugs(col.name, locale);

      for (const item of items) {
        if (!item.slug) continue;
        const path =
          locale === 'da' ? col.daPath(item.slug) : col.enPath(item.slug);
        entries.push({ loc: abs(path), lastmod: item.updatedAt });
      }
    }
  }

  // Matches — bare numeric event ID, identical slug in both locales.
  const events = await fetchABEvents({ limit: 100 }).catch(() => []);
  for (const event of events) {
    entries.push({ loc: abs(`/kamp/${event.eventId}`) });
    entries.push({ loc: abs(`/en/match/${event.eventId}`) });
  }

  // Players — `{id}-{slugified name}`, identical slug in both locales.
  const players = await fetchABPlayers('da').catch(() => []);
  for (const player of players) {
    const slug = getPlayerSlug(player.id, player.name);
    entries.push({ loc: abs(`/spiller/${slug}`) });
    entries.push({ loc: abs(`/en/player/${slug}`) });
  }

  // Staff — Strapi-driven roster (falls back to static COACHING_STAFF entries
  // internally for anyone not yet migrated); locale doesn't affect the slug.
  const staffRoster = await fetchStaffRoster('da');
  for (const staff of staffRoster) {
    entries.push({ loc: abs(`/stab/${staff.slug}`) });
    entries.push({ loc: abs(`/en/staff/${staff.slug}`) });
  }

  // Partners — each locale only links partners that actually have a row in
  // that locale (Strapi i18n requires an explicit per-locale entry; listing
  // a locale a partner hasn't been translated into yet would 302 for crawlers).
  const [daPartners, enPartners] = await Promise.all([
    fetchPartners('da'),
    fetchPartners('en'),
  ]);
  for (const partner of daPartners) {
    entries.push({ loc: abs(`/partnere/${partner.slug}`) });
  }
  for (const partner of enPartners) {
    entries.push({ loc: abs(`/en/partners/${partner.slug}`) });
  }

  return entries;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urlEls = entries
    .map((entry) => {
      const alternates = (entry.alternates ?? [])
        .map(
          (a) =>
            `<xhtml:link rel="alternate" hreflang="${escapeHtml(a.hreflang)}" href="${escapeHtml(a.href)}" />`
        )
        .join('');
      const lastmod = entry.lastmod
        ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`
        : '';
      return `<url><loc>${escapeHtml(entry.loc)}</loc>${lastmod}${alternates}</url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlEls}</urlset>`;
}
