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

const YOUTUBE_ID_RE =
  /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})/;

/**
 * Builds a schema.org VideoObject from a YouTube social embed, or null if no
 * video ID can be found in its embed code. `approximateUploadDate` is a
 * best-effort fallback (e.g. the match date) — the CMS doesn't store the
 * video's real publish date.
 */
export function youTubeVideoSchema(
  embed: { embedCode: string; caption?: string },
  approximateUploadDate: string
) {
  const match = embed.embedCode.match(YOUTUBE_ID_RE);
  const videoId = match?.[1] ?? match?.[2];
  if (!videoId) return null;

  const name = embed.caption ?? 'AB 1889 video';
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description: embed.caption ?? name,
    thumbnailUrl: [`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`],
    uploadDate: approximateUploadDate,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}
