import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { APIContext } from 'astro';
import sharp from 'sharp';

import abCrestDataUri from '../../../../public/images/ab-crest.svg?inline';
import { OG_COLORS, OG_FONT_FAMILY, renderTextSvgToPng } from '@/lib/og-image';
import { fetchPartnerBySlug, wasabiObjectKey } from '@/lib/strapi/client';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;
const BG_COLOR = '#F2F2F0';

const BUCKET = import.meta.env.WASABI_BUCKET ?? 'ab-media';
const REGION = import.meta.env.WASABI_REGION ?? 'eu-central-1';
const ENDPOINT = `https://s3.${REGION}.wasabisys.com`;
const STRAPI_URL = (
  import.meta.env.STRAPI_URL ?? 'http://localhost:1337'
).replace(/\/$/, '');

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: import.meta.env.WASABI_ACCESS_KEY_ID ?? '',
    secretAccessKey: import.meta.env.WASABI_SECRET_ACCESS_KEY ?? '',
  },
});

/**
 * Fetches a partner logo's raw bytes. Wasabi objects are read directly via S3 (the
 * bucket is private, so this needs our own credentials rather than a public fetch).
 * Anything else (Strapi Cloud's CDN, a local dev Strapi server) is a third-party
 * origin from this app's point of view, so a direct fetch is safe there too — unlike
 * self-fetching this app's own /api/media proxy, which gets redirected to Vercel's
 * deployment-protection SSO login instead of the real file (see src/lib/og-image.ts).
 */
async function fetchLogoBytes(logoUrl: string): Promise<Uint8Array | null> {
  const wasabiKey = wasabiObjectKey(logoUrl);
  if (wasabiKey) {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: wasabiKey })
    );
    if (!res.Body) return null;
    return (
      res.Body as { transformToByteArray(): Promise<Uint8Array> }
    ).transformToByteArray();
  }
  const absoluteUrl = logoUrl.startsWith('http')
    ? logoUrl
    : `${STRAPI_URL}${logoUrl}`;
  const res = await fetch(absoluteUrl);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

/** Contain-fit dimensions for an image inside a box, given its natural size. */
function containFit(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number
) {
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  return {
    width: Math.round(naturalW * scale),
    height: Math.round(naturalH * scale),
  };
}

export async function GET({ url }: APIContext) {
  const slug = url.searchParams.get('slug');
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'da';

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const partner = await fetchPartnerBySlug(slug, locale);
  if (!partner?.logo?.url) {
    return new Response('Partner not found', { status: 404 });
  }

  try {
    const logoBytes = await fetchLogoBytes(partner.logo.url);
    if (!logoBytes) {
      return new Response('Logo not found', { status: 404 });
    }

    const logoMeta = await sharp(logoBytes).metadata();
    const logoMime =
      logoMeta.format === 'svg'
        ? 'image/svg+xml'
        : `image/${logoMeta.format ?? 'png'}`;
    const logoDataUri = `data:${logoMime};base64,${Buffer.from(logoBytes).toString('base64')}`;

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

    const logoFit = containFit(
      logoMeta.width ?? innerBox,
      logoMeta.height ?? innerBox,
      innerBox,
      innerBox
    );
    const logoX = rightCardX + (cardSize - logoFit.width) / 2;
    const logoY = cardY + (cardSize - logoFit.height) / 2;

    const svg = `
      <svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${BG_COLOR}"/>
        <rect x="${leftCardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="16" fill="${OG_COLORS.white}" stroke="#E0E0DC" stroke-width="1"/>
        <rect x="${rightCardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="16" fill="${OG_COLORS.white}" stroke="#E0E0DC" stroke-width="1"/>
        <image href="${abCrestDataUri}" x="${abX}" y="${abY}" width="${abFit.width}" height="${abFit.height}"/>
        <image href="${logoDataUri}" x="${logoX}" y="${logoY}" width="${logoFit.width}" height="${logoFit.height}"/>
        <text x="600" y="${CANVAS_H / 2 + 24}" font-family="${OG_FONT_FAMILY}" font-size="56" font-weight="900" fill="#111111" text-anchor="middle">&#215;</text>
      </svg>
    `;

    const png = renderTextSvgToPng(svg);

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
