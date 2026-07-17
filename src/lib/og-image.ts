/**
 * Shared helpers for the /api/og/*.png SVG-to-PNG endpoints (via sharp).
 *
 * SVG <text> rendering depends on librsvg finding a matching system font —
 * on Vercel's serverless runtime, no fonts are installed at all, so
 * font-family="Arial, sans-serif" silently renders missing-glyph boxes for
 * every character. Embedding the brand font directly via @font-face removes
 * that host dependency entirely.
 *
 * The font (and other brand assets used by these endpoints) must be bundled
 * at build time via Vite's `?inline` import rather than fetched from `/fonts/…`
 * at request time: these endpoints previously self-fetched such assets over
 * HTTP from their own origin, which silently returns Vercel's deployment
 * protection (SSO) interstitial instead of the real file whenever protection
 * is enabled — the corrupted bytes then fail to parse as a font/image with
 * no error (fetch follows the redirect to a 200 OK HTML page), producing
 * tofu text and missing logos instead of a fetch failure.
 */
import abcCameraHeavyWoff2 from '../../public/fonts/ABCCameraPlain-Heavy.woff2?inline';

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

/** Inline <style>@font-face{...}</style> embedding the brand's heavy weight. */
export const OG_FONT_FACE_STYLE = `
      <style>
        @font-face {
          font-family: 'ABC Camera Plain';
          src: url(${abcCameraHeavyWoff2}) format('woff2');
          font-weight: 900;
          font-style: normal;
        }
      </style>
  `;
