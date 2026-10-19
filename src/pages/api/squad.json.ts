import type { APIRoute } from 'astro';

import { getPlayerSlug } from '@/data/player-cms-data';
import { getSquadPlayers } from '@/lib/si/squad';
import { fetchStaffRoster } from '@/lib/strapi/client';

export const prerender = false;

/**
 * Bulk machine-readable squad + coaching staff roster — for an agent or
 * integration that wants the whole list as typed data in one request instead
 * of crawling/markdown-negotiating every player and staff detail page.
 * Mirrors the precedence and overrides already applied on /truppen and
 * /en/squad (see getSquadPlayers), just serialized as JSON instead of HTML.
 */
export const GET: APIRoute = async ({ url }) => {
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'da';
  const playerPath = locale === 'en' ? 'en/player' : 'spiller';
  const staffPath = locale === 'en' ? 'en/staff' : 'stab';

  const [players, staff] = await Promise.all([
    getSquadPlayers(locale),
    fetchStaffRoster(locale),
  ]);

  const body = {
    club: 'Akademisk Boldklub (AB 1889)',
    locale,
    generatedAt: new Date().toISOString(),
    players: players.map((p) => ({
      name: p.name,
      position: p.position,
      shirtNumber: p.shirtNumber,
      nationality: p.country?.name ?? null,
      birthDate: p.birthDate,
      url: `https://ab.dk/${playerPath}/${getPlayerSlug(p.id, p.name)}`,
      photo: p.hidePhoto ? null : p.photoUrl,
    })),
    staff: staff.map((s) => ({
      name: s.name,
      role: s.role,
      nationality: s.nationality,
      url: `https://ab.dk/${staffPath}/${s.slug}`,
      photo: s.photoUrl,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=900, stale-while-revalidate=1800',
    },
  });
};
