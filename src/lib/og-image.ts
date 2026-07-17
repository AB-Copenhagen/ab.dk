/**
 * Shared helpers for the /api/og/*.png SVG-to-PNG endpoints.
 *
 * Text rendering (renderTextSvgToPng below) uses @resvg/resvg-js with
 * `loadSystemFonts: false` instead of sharp/librsvg — verified directly (not
 * assumed) that this is necessary: Vercel's serverless runtime has no fonts
 * installed at all, and sharp/librsvg's text rendering depends on the OS's
 * fontconfig to resolve *any* font-family, including generic ones like
 * "sans-serif" — every attempt to fix that by feeding it a font (self-fetch
 * over HTTP, then Wasabi directly, both for the licensed brand font) still
 * produced tofu, seemingly because librsvg's @font-face support for embedded/
 * data-URI fonts doesn't reliably work either. resvg takes font files
 * directly as an explicit option, bypassing OS font discovery entirely — a
 * local test with `loadSystemFonts: false` and no font file produced no text
 * at all (proving it doesn't silently borrow a host font the way librsvg
 * apparently does), and the same test with an explicit .ttf produced correct
 * text — so this is verified to work independent of the host environment,
 * not another guess.
 *
 * Bundles Inter (OFL-1.1, freely redistributable) rather than the brand font,
 * which is licensed and can't be committed to the repo. resvg-js only
 * accepts font *files* (a path on disk), not in-memory buffers, so the
 * bundled font is written to /tmp once per cold start and reused after.
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Resvg } from '@resvg/resvg-js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import interBlackDataUri from '../assets/fonts/Inter-Black.ttf?inline';
import interBoldDataUri from '../assets/fonts/Inter-Bold.ttf?inline';

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

export const OG_FONT_FAMILY = 'Inter';

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

/** Decodes a data: URI back to raw bytes — Vite's `?inline` uses base64 for binary assets, percent-encoding for SVG/text. */
function dataUriToBuffer(dataUri: string): Buffer {
  const comma = dataUri.indexOf(',');
  const meta = dataUri.slice(5, comma);
  const data = dataUri.slice(comma + 1);
  return meta.endsWith(';base64')
    ? Buffer.from(data, 'base64')
    : Buffer.from(decodeURIComponent(data), 'binary');
}

let fontFilesCache: string[] | null = null;

/** Writes the bundled Inter weights to /tmp once per cold start — resvg-js needs real file paths, not buffers. */
function ensureFontFilesOnDisk(): string[] {
  if (fontFilesCache) return fontFilesCache;
  const dir = join(tmpdir(), 'ab-og-fonts');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const files: [string, string][] = [
    ['Inter-Bold.ttf', interBoldDataUri],
    ['Inter-Black.ttf', interBlackDataUri],
  ];
  fontFilesCache = files.map(([name, dataUri]) => {
    const path = join(dir, name);
    if (!existsSync(path)) writeFileSync(path, dataUriToBuffer(dataUri));
    return path;
  });
  return fontFilesCache;
}

/**
 * Renders an SVG string (containing <text>) to PNG bytes using resvg-js with
 * the bundled Inter font — see this file's header for why sharp/librsvg
 * can't be used for anything with text in it.
 */
export function renderTextSvgToPng(svg: string): Uint8Array<ArrayBuffer> {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: ensureFontFilesOnDisk(),
      defaultFontFamily: 'Inter',
    },
  });
  return new Uint8Array(resvg.render().asPng());
}
