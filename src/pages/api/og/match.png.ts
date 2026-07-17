import type { APIContext } from 'astro';
import sharp from 'sharp';
import { fetchBytes, toBase64, escapeXml, ogFontFaceStyle, OG_FONT_FAMILY, OG_COLORS } from '@/lib/og-image';
import abCrestDataUri from '../../../../public/images/ab-crest.svg?inline';
import divisionLogoDataUri from '../../../../public/images/division-1-logo-white.svg?inline';

export const prerender = false;

const CANVAS_W = 1200;
const CANVAS_H = 630;

// Team crest sources are restricted to the AB crest (local) or the known SI API CDN host —
// this endpoint fetches these server-side, so arbitrary URLs must not be accepted.
const SAFE_AB_CREST = '/images/ab-crest.svg';
const SAFE_CDN_LOGO = /^https:\/\/dxugi372p6nmc\.cloudfront\.net\/spdk\/current\/256x256\/\d+\/teamlogo\.png$/;

function isSafeLogoUrl(value: string): boolean {
  return value === SAFE_AB_CREST || SAFE_CDN_LOGO.test(value);
}

// The AB crest is a local static asset — bundled at build time (see abCrestDataUri
// above) instead of fetched, so only the external SI API crest needs a live fetch.
async function logoDataUri(url: string): Promise<string> {
  if (url === SAFE_AB_CREST) return abCrestDataUri;
  const bytes = await fetchBytes(url);
  return `data:image/png;base64,${toBase64(bytes)}`;
}

export async function GET({ url }: APIContext) {
  const home = url.searchParams.get('home');
  const away = url.searchParams.get('away');
  const homeLogo = url.searchParams.get('homeLogo');
  const awayLogo = url.searchParams.get('awayLogo');
  const tournament = url.searchParams.get('tournament') ?? '';
  const date = url.searchParams.get('date') ?? '';
  const time = url.searchParams.get('time') ?? '';
  const venue = url.searchParams.get('venue') ?? '';

  if (!home || !away || !homeLogo || !awayLogo) {
    return new Response('Missing required params', { status: 400 });
  }
  if (!isSafeLogoUrl(homeLogo) || !isSafeLogoUrl(awayLogo)) {
    return new Response('Invalid logo URL', { status: 400 });
  }

  try {
    const [homeLogoDataUri, awayLogoDataUri, fontFaceStyle] = await Promise.all([
      logoDataUri(homeLogo),
      logoDataUri(awayLogo),
      ogFontFaceStyle(),
    ]);

    const crestSize = 200;
    const homeCrestX = 300 - crestSize / 2;
    const awayCrestX = 900 - crestSize / 2;
    const crestY = 175;
    const nameY = crestY + crestSize + 50;

    // Bumped well beyond the team crests' scale factor — the division logo is the
    // only non-team-logo graphic on the canvas and was previously the smallest
    // element on it (28px tall against 160px crests).
    const divisionLogoH = 48;
    const divisionLogoW = Math.round(divisionLogoH * (185 / 275));
    const topY = 54;

    const svg = `
      <svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        ${fontFaceStyle}
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#2A2A2A"/>

        <!-- Top left: division logo + label -->
        <image href="${divisionLogoDataUri}" x="70" y="${topY}" width="${divisionLogoW}" height="${divisionLogoH}"/>
        <text x="${70 + divisionLogoW + 18}" y="${topY + divisionLogoH - 10}" font-family="${OG_FONT_FAMILY}" font-size="22" font-weight="700" letter-spacing="3" fill="${OG_COLORS.white}">${escapeXml(tournament.toUpperCase())}</text>

        <!-- Top right: day, date -->
        <text x="1130" y="${topY + divisionLogoH - 10}" font-family="${OG_FONT_FAMILY}" font-size="22" font-weight="700" fill="${OG_COLORS.white}" fill-opacity="0.7" text-anchor="end">${escapeXml(date)}</text>

        <!-- Center: home crest + name -->
        <image href="${homeLogoDataUri}" x="${homeCrestX}" y="${crestY}" width="${crestSize}" height="${crestSize}"/>
        <text x="300" y="${nameY}" font-family="${OG_FONT_FAMILY}" font-size="38" font-weight="900" fill="${OG_COLORS.white}" text-anchor="middle">${escapeXml(home)}</text>

        <!-- VS -->
        <text x="600" y="${crestY + crestSize / 2 + 16}" font-family="${OG_FONT_FAMILY}" font-size="44" font-weight="900" fill="${OG_COLORS.gold}" text-anchor="middle">VS</text>

        <!-- Center: away crest + name -->
        <image href="${awayLogoDataUri}" x="${awayCrestX}" y="${crestY}" width="${crestSize}" height="${crestSize}"/>
        <text x="900" y="${nameY}" font-family="${OG_FONT_FAMILY}" font-size="38" font-weight="900" fill="${OG_COLORS.white}" text-anchor="middle">${escapeXml(away)}</text>

        <!-- Bottom center: local time + stadium -->
        ${
          [time, venue].filter(Boolean).length
            ? `<text x="600" y="585" font-family="${OG_FONT_FAMILY}" font-size="22" font-weight="700" fill="${OG_COLORS.white}" fill-opacity="0.7" text-anchor="middle">${escapeXml([time, venue].filter(Boolean).join('  ·  '))}</text>`
            : ''
        }
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
