import type { StrapiVenue } from '@/lib/strapi/client';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** Builds a schema.org BreadcrumbList from an ordered list of ancestor → current-page crumbs. */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Builds a schema.org FAQPage from question/answer pairs — lets AI answer
 * engines and search rich results lift the Q&A straight out of structured
 * data instead of having to parse it out of prose. `answer` should be plain
 * text (no HTML markup).
 */
export function faqPageSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Builds a schema.org ItemList for a listing page (squad, fixtures, partners)
 * out of already-built schema.org objects (each with at least `@type`, `name`
 * and `url`) — so an agent can read the whole list as data in one request
 * instead of crawling every detail page individually.
 */
export function itemListSchema(name: string, items: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item,
    })),
  };
}

/**
 * Estimated final whistle time for schema.org's required SportsEvent.endDate —
 * the SI API only gives us kickoff time. ~2 hours covers two 45-minute halves,
 * halftime, and stoppage time; close enough for a field Google treats as a
 * rough scheduling signal, not a precise duration.
 */
export function estimatedMatchEndDate(startDate: string): string {
  return new Date(
    new Date(startDate).getTime() + 2 * 60 * 60 * 1000
  ).toISOString();
}

/**
 * Builds schema.org SportsEvent.location for a match page. For AB home
 * fixtures the address is AB's own fixed ground. For away fixtures, uses the
 * editor-maintained Venue row for that opponent (see AGENTS.md "Managing
 * away-game venues") when one exists; otherwise falls back to the country
 * alone rather than omitting `address` and failing Event rich-result
 * validation outright — Google treats `location.address` as required.
 */
export function matchLocationSchema({
  isHome,
  venueName,
  awayVenue,
}: {
  isHome: boolean;
  venueName: string;
  awayVenue: StrapiVenue | null;
}) {
  if (isHome) {
    return {
      '@type': 'Place',
      name: venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Gladsaxevej 202',
        addressLocality: 'Søborg',
        postalCode: '2860',
        addressCountry: 'DK',
      },
    };
  }
  return {
    '@type': 'Place',
    name: venueName,
    address: awayVenue
      ? {
          '@type': 'PostalAddress',
          streetAddress: awayVenue.streetAddress,
          addressLocality: awayVenue.addressLocality,
          postalCode: awayVenue.postalCode,
          addressCountry: awayVenue.addressCountry,
        }
      : { '@type': 'PostalAddress', addressCountry: 'DK' },
  };
}

const YOUTUBE_ID_RE =
  /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})/;

/**
 * Builds a schema.org VideoObject from a YouTube social embed, or null if no
 * video ID can be found in its embed code. `approximateUploadDate` is a
 * best-effort fallback (e.g. the match date) — the CMS doesn't store the
 * video's real publish date.
 *
 * `isAccessibleForFree` defaults to true (the common case — a public embed).
 * Pass `false` for a membership-gated video: it's a `CreativeWork`-level
 * property that `VideoObject` inherits, and is Google's documented signal for
 * paywalled content — no `hasPart`/`cssSelector` needed, since that pattern
 * is for a *partial*-page text paywall, not a video that's gated outright.
 */
export function youTubeVideoSchema(
  embed: { embedCode: string; caption?: string },
  approximateUploadDate: string,
  isAccessibleForFree = true
) {
  const match = embed.embedCode.match(YOUTUBE_ID_RE);
  const videoId = match?.[1] ?? match?.[2];
  // A playlist embed (`embed/videoseries?list=...`) matches this regex too —
  // "videoseries" happens to be exactly 11 characters, the same length as a
  // real video ID — but a VideoObject describes a single video, not a
  // playlist, and building one here would carry a bogus thumbnail/embedUrl
  // with the real `?list=` id silently dropped. No correct VideoObject
  // exists for a playlist, so this returns null like any other non-match.
  if (!videoId || videoId === 'videoseries') return null;

  const name = embed.caption ?? 'AB 1889 video';
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description: embed.caption ?? name,
    thumbnailUrl: [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`],
    uploadDate: approximateUploadDate,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    ...(isAccessibleForFree ? {} : { isAccessibleForFree: false }),
  };
}

/**
 * Builds a schema.org VideoObject for a media.ab.dk (SAMS) embed. Unlike the YouTube
 * variant, there's no CDN thumbnail convention to derive — `thumbnailUrl` is only
 * included when an editor uploaded one in Strapi (see StrapiAbtvVideo.thumbnail).
 */
export function samsVideoSchema(
  embed: { embedUrl: string; caption?: string; thumbnailUrl?: string },
  approximateUploadDate: string,
  isAccessibleForFree = true
) {
  const name = embed.caption ?? 'AB 1889 video';
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description: embed.caption ?? name,
    ...(embed.thumbnailUrl ? { thumbnailUrl: [embed.thumbnailUrl] } : {}),
    uploadDate: approximateUploadDate,
    embedUrl: embed.embedUrl,
    ...(isAccessibleForFree ? {} : { isAccessibleForFree: false }),
  };
}
