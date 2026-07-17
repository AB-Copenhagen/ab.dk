import type { APIContext } from 'astro';
import sharp from 'sharp';
import { ogFontFaceStyle, OG_FONT_FAMILY, OG_COLORS } from '@/lib/og-image';
import abCrestDataUri from '../../../../public/images/ab-crest.svg?inline';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;
const BG_COLOR = '#F2F2F0';

// Partner logos always live under /images/sponsors/ in this codebase (see src/data/partners.ts)
// — this endpoint takes `logo` from the client, so it must not become an open SSRF proxy.
const SAFE_LOGO_PATH = /^\/images\/sponsors\/.*\.(png|jpe?g|gif|svg|webp)$/i;

// All ~30 partner logos are static files committed to the repo, so they're bundled at
// build time (like the AB crest below) instead of self-fetched over HTTP — a self-fetch
// to this app's own origin doesn't carry the caller's session, so on a deployment with
// Vercel deployment protection enabled it gets silently redirected to the SSO login page
// instead of the real file (see src/lib/og-image.ts's file header for the full story).
// Keyed by the same /images/sponsors/... path used in partners.ts and the `logo` param.
const sponsorLogoModules = import.meta.glob<string>(
  '../../../../public/images/sponsors/**/*.{png,jpg,jpeg,gif,webp,svg}',
  { eager: true, query: '?inline', import: 'default' }
);
const sponsorLogos = new Map(
  Object.entries(sponsorLogoModules).map(([path, dataUri]) => [
    path.replace(/^.*\/public\/images\/sponsors\//, '/images/sponsors/'),
    dataUri,
  ])
);

/** Decodes a data: URI back to raw bytes — Vite's `?inline` uses base64 for binary assets, percent-encoding for SVG/text. */
function dataUriToBytes(dataUri: string): Uint8Array {
  const comma = dataUri.indexOf(',');
  const meta = dataUri.slice(5, comma);
  const data = dataUri.slice(comma + 1);
  if (meta.endsWith(';base64')) {
    return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  }
  return new TextEncoder().encode(decodeURIComponent(data));
}

/** Contain-fit dimensions for an image inside a box, given its natural size. */
function containFit(naturalW: number, naturalH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  return { width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) };
}

export async function GET({ url }: APIContext) {
  const logoPath = url.searchParams.get('logo');

  const partnerDataUri = logoPath && SAFE_LOGO_PATH.test(logoPath) ? sponsorLogos.get(logoPath) : undefined;
  if (!partnerDataUri) {
    return new Response('Invalid logo path', { status: 400 });
  }

  try {
    const fontFaceStyle = await ogFontFaceStyle();

    const cardSize = 360;
    const cardPadding = 48;
    const innerBox = cardSize - cardPadding * 2;

    const leftCardX = 150;
    const rightCardX = 690;
    const cardY = (CANVAS_H - cardSize) / 2;

    // AB crest is a known-square SVG (1792x1792 viewBox) — no need to probe it.
    const abFit = containFit(1792, 1792, innerBox, innerBox);
    const abX = leftCardX + (cardSize - abFit.width) / 2;
    const abY = cardY + (cardSize - abFit.height) / 2;

    const partnerMeta = await sharp(dataUriToBytes(partnerDataUri)).metadata();
    const partnerFit = containFit(
      partnerMeta.width ?? innerBox,
      partnerMeta.height ?? innerBox,
      innerBox,
      innerBox
    );
    const partnerX = rightCardX + (cardSize - partnerFit.width) / 2;
    const partnerY = cardY + (cardSize - partnerFit.height) / 2;

    const svg = `
      <svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        ${fontFaceStyle}
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${BG_COLOR}"/>
        <rect x="${leftCardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="16" fill="${OG_COLORS.white}" stroke="#E0E0DC" stroke-width="1"/>
        <rect x="${rightCardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="16" fill="${OG_COLORS.white}" stroke="#E0E0DC" stroke-width="1"/>
        <image href="${abCrestDataUri}" x="${abX}" y="${abY}" width="${abFit.width}" height="${abFit.height}"/>
        <image href="${partnerDataUri}" x="${partnerX}" y="${partnerY}" width="${partnerFit.width}" height="${partnerFit.height}"/>
        <text x="600" y="${CANVAS_H / 2 + 24}" font-family="${OG_FONT_FAMILY}" font-size="56" font-weight="900" fill="#111111" text-anchor="middle">&#215;</text>
      </svg>
    `;

    const png = await sharp(new TextEncoder().encode(svg)).png().toBuffer();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Failed to generate image', { status: 502 });
  }
}
