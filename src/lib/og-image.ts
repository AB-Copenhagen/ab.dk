/**
 * Shared helpers for the /api/og/*.png SVG-to-PNG endpoints (via sharp).
 *
 * Text uses a plain system-font stack (see OG_FONT_FAMILY below), not the
 * brand font — Vercel's serverless runtime has no fonts installed at all, so
 * embedding the brand font required fetching it at request time on every
 * call, and every fetch strategy tried (self-fetch over HTTP, then Wasabi
 * directly) still produced tofu text on at least one endpoint for reasons
 * that couldn't be pinned down without server-side log access. Dropped in
 * favor of a plain, reliable sans-serif rather than keep chasing it.
 *
 * fetchWasabiBytes below is still used for genuinely dynamic Wasabi-hosted
 * assets (player photos, article cover images) — those fetch correctly, this
 * was specifically a font-loading problem.
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const OG_FONT_FAMILY = 'Arial, Helvetica, sans-serif';

/**
 * Mirrors src/styles/tokens.css. These SVGs are rasterized standalone by
 * sharp/librsvg (no browser, no stylesheet cascade) so CSS custom properties
 * like var(--ab-green) can't resolve here — this constant is the OG-image
 * equivalent of the design tokens.
 */
export const OG_COLORS = {
  green: '#006A52',
  gold: '#D6A02A',
  beige: '#D3BC8D',
  neon: '#00FF1F',
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

const WASABI_BUCKET = import.meta.env.WASABI_BUCKET ?? 'ab-media';
const WASABI_REGION = import.meta.env.WASABI_REGION ?? 'eu-central-1';

const wasabiClient = new S3Client({
  region: WASABI_REGION,
  endpoint: `https://s3.${WASABI_REGION}.wasabisys.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: import.meta.env.WASABI_ACCESS_KEY_ID ?? '',
    secretAccessKey: import.meta.env.WASABI_SECRET_ACCESS_KEY ?? '',
  },
});

/**
 * Fetches an object directly from the Wasabi bucket that backs /api/media/[...key] —
 * bypasses this app's own HTTP layer entirely, so it's immune to Vercel deployment
 * protection regardless of how that's configured (see file header). Any OG endpoint
 * that needs a Wasabi-hosted asset (font, player photo, …) should use this instead
 * of self-fetching `/api/media/...` over HTTP.
 */
export async function fetchWasabiBytes(key: string): Promise<Uint8Array> {
  const res = await wasabiClient.send(
    new GetObjectCommand({ Bucket: WASABI_BUCKET, Key: key })
  );
  if (!res.Body) throw new Error(`Wasabi object has no body: ${key}`);
  return (
    res.Body as { transformToByteArray(): Promise<Uint8Array> }
  ).transformToByteArray();
}
