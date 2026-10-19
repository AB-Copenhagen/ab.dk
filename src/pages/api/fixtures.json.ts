import type { APIRoute } from 'astro';

import { abConfig } from '@/lib/config/ab';
import {
  type SIEvent,
  cupTournamentLabel,
  fetchABEvents,
  formatEventScore,
  isCupMatch,
} from '@/lib/si/client';

export const prerender = false;

/**
 * Bulk machine-readable fixture list — recent results and upcoming matches
 * in one typed JSON response, rather than requiring an agent to crawl/
 * markdown-negotiate /kampe or page through the kampe.xml RSS feed (which
 * only covers a 90-day window and omits venue/tournament/ticket fields).
 * `from`/`to` accept YYYY-MM-DD and default to a season-ish window; `limit`
 * caps the response (default 100, max 200 to match the underlying SI call).
 */
export const GET: APIRoute = async ({ url }) => {
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'da';

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth() - 11);
  const defaultTo = new Date(now);
  defaultTo.setMonth(defaultTo.getMonth() + 3);

  const fromDate =
    url.searchParams.get('from') ?? defaultFrom.toISOString().slice(0, 10);
  const toDate =
    url.searchParams.get('to') ?? defaultTo.toISOString().slice(0, 10);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get('limit')) || 100)
  );

  let events: SIEvent[] = [];
  try {
    events = await fetchABEvents({
      locale,
      limit,
      fromDate,
      toDate,
      allCompetitions: true,
    });
  } catch {
    // SI API unavailable
  }

  events.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const matchPath = locale === 'en' ? 'en/match' : 'kamp';

  const body = {
    club: 'Akademisk Boldklub (AB 1889)',
    locale,
    generatedAt: new Date().toISOString(),
    from: fromDate,
    to: toDate,
    fixtures: events.map((event) => {
      const isABHome = event.homeId === abConfig.teamId;
      const isFinished = event.statusType === 'finished';
      return {
        eventId: event.eventId,
        startDate: event.startDate,
        status: event.statusType,
        tournament: event.tournamentName,
        isCup: isCupMatch(event),
        cupRound: isCupMatch(event) ? cupTournamentLabel(event, locale) : null,
        homeTeam: isABHome ? 'AB' : event.homeName,
        awayTeam: isABHome ? event.awayName : 'AB',
        venue: event.properties?.venueName ?? null,
        score: isFinished ? formatEventScore(event.score) : null,
        url: `https://ab.dk/${matchPath}/${event.eventId}`,
      };
    }),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
