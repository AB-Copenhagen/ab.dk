/**
 * Minimal SportsInnovation API helper for the match-picker custom field —
 * lists the current season's matches so an editor can search by team names
 * instead of typing a raw SI event ID. Mirrors the Astro app's own SI client
 * (src/lib/si/client.ts) but lives here since Strapi's backend can't import
 * across the two separate apps in this monorepo.
 */
const SI_API_BASE_URL = process.env.SI_API_BASE_URL || 'https://ss2.tjekscores.dk';
const AB_TEAM_ID = Number(process.env.AB_TEAM_ID || '9805');
const AB_TOURNAMENT_ID = process.env.AB_TOURNAMENT_ID ? Number(process.env.AB_TOURNAMENT_ID) : 85;
const AB_SEASON_ID = process.env.AB_SEASON_ID ? Number(process.env.AB_SEASON_ID) : 36245;

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
  if (!accessToken) return null;

  const url = new URL(`${SI_API_BASE_URL}/events-v2`);
  url.searchParams.set('access_token', accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;

  const data = (await res.json()) as { events?: SIEvent[] };
  return data.events ?? [];
}

/** List AB's current-season fixtures/results as `{ id, label }` picker options, newest first. */
export async function listCurrentSeasonMatches(): Promise<MatchOption[]> {
  const events = await siEventsRequest({
    teamId: String(AB_TEAM_ID),
    tournamentId: String(AB_TOURNAMENT_ID),
    seasonId: String(AB_SEASON_ID),
    sportId: '1',
    limit: '100',
  });
  if (!events) return [];

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
