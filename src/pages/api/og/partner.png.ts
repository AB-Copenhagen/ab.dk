import type { APIContext } from 'astro';
import sharp from 'sharp';
import { fetchBytes, toBase64, ogFontFaceStyle, OG_FONT_FAMILY, OG_COLORS } from '@/lib/og-image';
import abCrestDataUri from '../../../../public/images/ab-crest.svg?inline';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;
const BG_COLOR = '#F2F2F0';

// Partner logos always live under /images/sponsors/ in this codebase (see src/data/partners.ts)
// — this endpoint fetches `logo` server-side, so it must not become an open SSRF proxy.
const SAFE_LOGO_PATH = /^\/images\/sponsors\/.*\.(png|jpe?g|gif|svg|webp)$/i;

function mimeFor(path: string): string {
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/** Contain-fit dimensions for an image inside a box, given its natural size. */
function containFit(naturalW: number, naturalH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  return { width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) };
}

export async function GET({ url }: APIContext) {
  const logoPath = url.searchParams.get('logo');

  if (!logoPath || !SAFE_LOGO_PATH.test(logoPath)) {
    return new Response('Invalid logo path', { status: 400 });
  }

  try {
    const [partnerLogoBytes, fontFaceStyle] = await Promise.all([
      fetchBytes(`${url.origin}${logoPath}`),
      ogFontFaceStyle(),
    ]);

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

    const partnerMeta = await sharp(partnerLogoBytes).metadata();
    const partnerFit = containFit(
      partnerMeta.width ?? innerBox,
      partnerMeta.height ?? innerBox,
      innerBox,
      innerBox
    );
    const partnerX = rightCardX + (cardSize - partnerFit.width) / 2;
    const partnerY = cardY + (cardSize - partnerFit.height) / 2;

    const partnerDataUri = `data:${mimeFor(logoPath)};base64,${toBase64(partnerLogoBytes)}`;

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
