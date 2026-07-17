import type { APIContext } from 'astro';

import { COACHING_STAFF } from '@/data/coaching-staff';
import { PARTNERS } from '@/data/partners';
import { fetchABEvents, fetchABPlayers } from '@/lib/si/client';
import { fetchCollectionType } from '@/lib/strapi/client';
import { escapeHtml } from '@/lib/utils';

export const prerender = false;

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  alternates?: { hreflang: string; href: string }[];
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// da/en URL pairs for statically-routed pages (mirrors src/lib/i18n.ts's slug map).
const STATIC_ROUTES: [string, string][] = [
  ['/', '/en'],
  ['/kampe', '/en/matches'],
  ['/hold', '/en/squad'],
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

export async function GET(context: APIContext) {
  const site = (context.site?.toString() ?? context.url.origin).replace(
    /\/$/,
    ''
  );
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
      const items = await fetchCollectionType<
        { slug: string; updatedAt?: string }[]
      >(col.name, { locale, pagination: { pageSize: 100 } }).catch(
        () => [] as { slug: string; updatedAt?: string }[]
      );

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
    const slug = `${player.id}-${toSlug(player.name)}`;
    entries.push({ loc: abs(`/spiller/${slug}`) });
    entries.push({ loc: abs(`/en/player/${slug}`) });
  }

  // Staff and partners — local static data, no fetch needed.
  for (const staff of COACHING_STAFF) {
    entries.push({ loc: abs(`/stab/${staff.slug}`) });
    entries.push({ loc: abs(`/en/staff/${staff.slug}`) });
  }
  for (const partner of PARTNERS) {
    entries.push({ loc: abs(`/partnere/${partner.slug}`) });
    entries.push({ loc: abs(`/en/partners/${partner.slug}`) });
  }

  return new Response(buildSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
  });
}

function buildSitemapXml(entries: SitemapEntry[]): string {
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
