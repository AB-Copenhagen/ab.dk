const YOUTUBE_ID_RE =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/** Extracts an 11-char YouTube video ID from a URL or embed code, or null if none found. */
export function extractYouTubeId(urlOrEmbed: string): string | null {
  return urlOrEmbed.match(YOUTUBE_ID_RE)?.[1] ?? null;
}

/** YouTube's CDN thumbnail for a video ID. */
export function youTubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
