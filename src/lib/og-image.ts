/**
 * Shared helpers for the /api/og/*.png SVG-to-PNG endpoints (via sharp).
 *
 * SVG <text> rendering depends on librsvg finding a matching system font —
 * on Vercel's serverless runtime, no fonts are installed at all, so
 * font-family="Arial, sans-serif" silently renders missing-glyph boxes for
 * every character. Embedding the brand font directly via @font-face removes
 * that host dependency entirely.
 *
 * The font itself is licensed and gitignored (public/fonts/ABCCameraPlain-*.*,
 * see .gitignore/README), so it can't be bundled at build time via a Vite
 * `?inline` import: that works on a dev machine that happens to have the file
 * on disk, but fails the production build outright (Could not resolve …) since
 * the file doesn't exist in the deployed checkout at all.
 *
 * It's fetched directly from Wasabi S3 (see fetchWasabiBytes below) rather
 * than self-fetched over HTTP from `/api/media/fonts/…`: a server-side fetch
 * to this app's own origin doesn't carry the caller's session, so on any
 * deployment with Vercel deployment protection enabled, that self-fetch gets
 * silently redirected to the SSO login page instead of the real file —
 * fetch() follows the redirect and returns 200, so the corrupted HTML gets
 * embedded as if it were valid asset data with no error thrown, producing
 * tofu text (or a missing/broken image, for anything binary). Fetching
 * straight from Wasabi sidesteps Vercel's protection entirely — the same
 * principle applies to any other Wasabi-hosted asset these endpoints need
 * (e.g. player photos), not just this font.
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

export const OG_FONT_FAMILY = "'ABC Camera Plain', Arial, sans-serif";

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
  const res = await wasabiClient.send(new GetObjectCommand({ Bucket: WASABI_BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Wasabi object has no body: ${key}`);
  return (res.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
}

/** Inline <style>@font-face{...}</style> embedding the brand's heavy weight. */
export async function ogFontFaceStyle(): Promise<string> {
  const bytes = await fetchWasabiBytes('fonts/ABCCameraPlain-Heavy.woff2');
  return `
      <style>
        @font-face {
          font-family: 'ABC Camera Plain';
          src: url(data:font/woff2;base64,${toBase64(bytes)}) format('woff2');
          font-weight: 900;
          font-style: normal;
        }
      </style>
  `;
}
