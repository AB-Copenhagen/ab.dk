/**
 * Minimal SportsInnovation API helper for the match-picker custom field —
 * lists the current season's matches so an editor can search by team names
 * instead of typing a raw SI event ID. Mirrors the Astro app's own SI client
 * (src/lib/si/client.ts) but lives here since Strapi's backend can't import
 * across the two separate apps in this monorepo.
 */
const SI_API_BASE_URL = process.env.SI_API_BASE_URL || 'https://ss2.tjekscores.dk';
const AB_TEAM_ID = Number(process.env.AB_TEAM_ID || '9805');

interface Competition {
  tournamentId: number;
  seasonId: number;
  stageId?: number;
}

// AB's league campaign — 1.Division.
const LEAGUE_COMPETITION: Competition = {
  tournamentId: process.env.AB_TOURNAMENT_ID ? Number(process.env.AB_TOURNAMENT_ID) : 85,
  seasonId: process.env.AB_SEASON_ID ? Number(process.env.AB_SEASON_ID) : 36245,
};

// AB's cup campaign — Betano Pokalen.
const CUP_COMPETITION: Competition = {
  tournamentId: process.env.AB_CUP_TOURNAMENT_ID
    ? Number(process.env.AB_CUP_TOURNAMENT_ID)
    : 242,
  seasonId: process.env.AB_CUP_SEASON_ID ? Number(process.env.AB_CUP_SEASON_ID) : 40838,
  stageId: process.env.AB_CUP_STAGE_ID ? Number(process.env.AB_CUP_STAGE_ID) : 939515,
};

const COMPETITIONS: Competition[] = [LEAGUE_COMPETITION, CUP_COMPETITION];

export interface MatchOption {
  id: number;
  label: string;
}

interface SIEvent {
  eventId: number;
  startDate: string;
  homeName: string;
  awayName: string;
}

function formatMatchLabel(event: SIEvent): string {
  return `${event.homeName} vs ${event.awayName} — ${event.startDate.slice(0, 10)}`;
}

async function siEventsRequest(
  params: Record<string, string>
): Promise<SIEvent[] | null> {
  const accessToken = process.env.SI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn(
      "[match-picker] SI_ACCESS_TOKEN is not set — the match picker will show no options. " +
        "Set it in this environment's variables (same value used by the Astro app)."
    );
    return null;
  }

  const url = new URL(`${SI_API_BASE_URL}/events-v2`);
  url.searchParams.set('access_token', accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  } catch (err) {
    console.warn('[match-picker] SI API request threw', err);
    return null;
  }
  if (!res.ok) {
    console.warn(
      `[match-picker] SI API request failed: ${res.status} ${res.statusText}`
    );
    return null;
  }

  const data = (await res.json()) as { events?: SIEvent[] };
  return data.events ?? [];
}

/** List AB's current-season fixtures/results (league + cup) as `{ id, label }` picker options, newest first. */
export async function listCurrentSeasonMatches(): Promise<MatchOption[]> {
  const eventsByCompetition = await Promise.all(
    COMPETITIONS.map((competition) => {
      const params: Record<string, string> = {
        teamId: String(AB_TEAM_ID),
        tournamentId: String(competition.tournamentId),
        seasonId: String(competition.seasonId),
        sportId: '1',
        limit: '100',
      };
      if (competition.stageId !== undefined) {
        params.stageId = String(competition.stageId);
      }
      return siEventsRequest(params);
    })
  );

  const seen = new Set<number>();
  const events = eventsByCompetition
    .filter((events): events is SIEvent[] => events !== null)
    .flat()
    .filter((event) => {
      if (seen.has(event.eventId)) return false;
      seen.add(event.eventId);
      return true;
    });

  return events
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .map((event) => ({ id: event.eventId, label: formatMatchLabel(event) }));
}

/** Resolve a single event ID to a human-readable "Home vs Away — date" label, or null if unavailable. */
export async function getMatchLabel(eventId: number): Promise<string | null> {
  const events = await siEventsRequest({ eventId: String(eventId) });
  const event = events?.[0];
  return event ? formatMatchLabel(event) : null;
}
