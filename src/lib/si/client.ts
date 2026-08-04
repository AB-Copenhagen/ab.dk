/**
 * SportsInnovation API client for AB 1889.
 *
 * All functions are server-only — do not import in Client Components.
 * The access token is injected server-side and never sent to the browser.
 *
 * API docs: https://ss2.tjekscores.dk/superliga-docs/#
 */
import { CacheManager, FileCacheDriver } from '@datum-cloud/strapi-revalidate';

import { abConfig, siConfig } from '../config/ab';
import { normalizeApostrophes } from '../utils';

// /tmp is writable on Vercel serverless; project dir is not.
const CACHE_DIR = '/tmp/si-cache';
const cache = new CacheManager({
  primary: new FileCacheDriver({ dir: CACHE_DIR }),
  fallback: new FileCacheDriver({ dir: `${CACHE_DIR}-fallback` }),
  defaultTtl: 60 * 5,
});
// Event data includes live scores during matches, so it needs a much shorter
// TTL than the mostly-static reference data (teams, players, standings).
const LIVE_TTL = 20;

async function siCacheKey(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, string | number>>((acc, key) => {
      const value = params[key];
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});
  const bytes = new TextEncoder().encode(JSON.stringify(sorted));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `si-${slug}-${hash}`;
}

export type Locale = 'da' | 'en';

export type EventStatus =
  'notstarted' | 'inprogress' | 'finished' | 'cancelled';

export interface SIScoreData {
  home: number | string;
  away: number | string;
}

export interface SIEvent {
  eventId: number;
  startDate: string;
  statusType: EventStatus;
  statusFull: string;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  score: SIScoreData | string | null;
  detailedScore: unknown;
  tournamentName: string;
  tournamentId: number;
  sportId: number;
  properties?: {
    venue?: string;
    venueName?: string;
  };
}

/** Normalise the API's score field to a "H-A" string, or null if unavailable. */
export function formatEventScore(
  score: SIScoreData | string | null | undefined
): string | null {
  if (!score) return null;
  if (typeof score === 'string') return score;
  const h = Number(score.home);
  const a = Number(score.away);
  if (isNaN(h) || isNaN(a)) return null;
  return `${h}-${a}`;
}

/**
 * True for Danish Cup fixtures. SI has no stable tournament ID for the cup —
 * it changes every season with the title sponsor (DBU Pokalen, Oddset
 * Pokalen, Betano Pokalen, …) — but "Pokalen" is always in the name.
 */
export function isCupMatch(event: Pick<SIEvent, 'tournamentName'>): boolean {
  return /pokalen/i.test(event.tournamentName ?? '');
}

/**
 * Cup fixtures are branded by their title sponsor each season ("Betano
 * Pokalen", "Oddset Pokalen", …) — derive a "<Sponsor> Cup"/"<Sponsor> Pokal"
 * label from that instead of a generic "Cup match" tag.
 */
export function cupTournamentLabel(
  event: Pick<SIEvent, 'tournamentName'>,
  locale: Locale
): string {
  const sponsor = (event.tournamentName ?? '')
    .replace(/\s*pokalen\s*$/i, '')
    .trim();
  const suffix = locale === 'da' ? 'Pokal' : 'Cup';
  return sponsor ? `${sponsor} ${suffix}` : suffix;
}

const TEAM_LOGO_CDN =
  (import.meta.env.SI_TEAM_LOGO_BASE_URL as string | undefined)?.replace(
    /\/$/,
    ''
  ) ?? 'https://dxugi372p6nmc.cloudfront.net/spdk/current/256x256';

/** Team crest URL — local AB asset or SI CloudFront CDN by team ID. */
export function getTeamLogoSrc(teamId: number): string {
  if (teamId === abConfig.teamId) return '/images/ab-crest.svg';
  return `${TEAM_LOGO_CDN}/${teamId}/teamlogo.png`;
}

export interface SIIncident {
  incidentType: string;
  time: number;
  playerId?: number;
  playerName?: string;
  teamId?: number;
  isHome: boolean;
}

export interface SITeam {
  id: number;
  name: string;
  shortName: string;
  gender: string;
  sportId: number;
}

export interface SIPlayerProfile {
  id: number;
  name: string;
  position: string;
  countryName?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  age?: number;
  country?: { id: number; name: string; code: string };
  currentTeam?: { id: number; name: string; number: number };
}

export interface SIHighlight {
  id: string;
  title: string;
  url: string;
  source: 'youtube' | '23video';
  eventId?: number;
  teamId?: number;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function siFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const key = await siCacheKey(path, params);
  const ttl = path.startsWith('/events') ? LIVE_TTL : undefined;

  const result = await cache.getWithFallback<T>(
    key,
    async () => {
      try {
        const url = new URL(`${siConfig.baseUrl}${path}`);
        url.searchParams.set('access_token', siConfig.accessToken);

        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            url.searchParams.set(k, String(v));
          }
        }

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
      } catch {
        return null;
      }
    },
    { ttl, tags: [path] }
  );

  if (result === null) {
    throw new Error(
      `SI API error on ${path}: request failed, no cached data available`
    );
  }
  return result;
}

// ── Events (fixtures & results) ───────────────────────────────────────────────

export interface FetchEventsParams {
  fromDate?: string;
  toDate?: string;
  round?: number;
  status?: EventStatus;
  limit?: number;
  locale?: Locale;
  /**
   * Include every competition AB plays (league + cup) instead of scoping to
   * the league season. Only safe to set when fromDate/toDate bound the query —
   * SI's `seasonId` filter is what excludes the cup, and dropping it with no
   * date range falls through to the API's unbounded default (events back to 1999).
   */
  allCompetitions?: boolean;
}

/** Fetch AB's fixtures and results for the current season. */
export async function fetchABEvents(
  params: FetchEventsParams = {}
): Promise<SIEvent[]> {
  const { allCompetitions, ...rest } = params;
  // API returns { events: SIEvent[] }
  const data = await siFetch<{ events: SIEvent[] }>('/events-v2', {
    teamId: abConfig.teamId,
    tournamentId: abConfig.tournamentId ?? undefined,
    seasonId: allCompetitions ? undefined : (abConfig.seasonId ?? undefined),
    sportId: 1,
    limit: 100,
    locale: params.locale ?? 'da',
    ...rest,
  });
  return data.events ?? [];
}

/** Fetch a single event by ID. */
export async function fetchEvent(
  eventId: number,
  locale: Locale = 'da'
): Promise<SIEvent> {
  const data = await siFetch<{ events: SIEvent[] }>('/events-v2', {
    eventId,
    locale,
  });
  const event = (data.events ?? [])[0];
  if (!event) throw new Error(`Event ${eventId} not found`);
  return event;
}

/** Fetch match incidents (goals, cards, substitutions) for an event. */
export async function fetchEventIncidents(
  eventId: number
): Promise<SIIncident[]> {
  return siFetch<SIIncident[]>(`/events/${eventId}/incidents`);
}

// ── Standings ─────────────────────────────────────────────────────────────────

export interface SIStandingRow {
  rank: number;
  teamId: number;
  teamName: string;
  teamShortName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesDraw: number;
  matchesLost: number;
  points: number;
  goalsScored: number;
  goalsConceded: number;
}

/** Fetch the current 1.division standings table. */
export async function fetchStandings(
  locale: Locale = 'da'
): Promise<SIStandingRow[]> {
  if (!abConfig.tournamentId) {
    throw new Error('AB_TOURNAMENT_ID is not set — standings unavailable');
  }
  // /tournaments/:id/standings returns a flat array of rows directly
  return siFetch<SIStandingRow[]>(
    `/tournaments/${abConfig.tournamentId}/standings`,
    { locale }
  );
}

// ── Teams ─────────────────────────────────────────────────────────────────────

/** Fetch AB's team details. */
export async function fetchABTeam(locale: Locale = 'da'): Promise<SITeam> {
  return siFetch<SITeam>(`/teams/${abConfig.teamId}`, { locale });
}

/** Fetch AB's current squad members. */
export async function fetchABSquad(locale: Locale = 'da') {
  return siFetch(`/teams/${abConfig.teamId}/members`, { locale });
}

/** Fetch all teams (used for opponent logos in fixtures). */
export async function fetchAllTeams(locale: Locale = 'da'): Promise<SITeam[]> {
  return siFetch<SITeam[]>('/teams', { locale });
}

// ── Players ───────────────────────────────────────────────────────────────────

export type PlayerPosition = 'keeper' | 'defender' | 'midfielder' | 'forward';

export interface SIPlayer {
  id: number;
  name: string;
  position: PlayerPosition;
  shirtNumber: number | null;
  birthDate: string | null;
  country?: { id: number; name: string } | null;
}

/** Fetch all registered AB players for the current team. */
export async function fetchABPlayers(
  locale: Locale = 'da'
): Promise<SIPlayer[]> {
  if (!abConfig.teamId) return [];
  const players = await siFetch<SIPlayer[]>('/players', {
    teamId: abConfig.teamId,
    locale,
  });
  return players.map((p) => ({
    ...p,
    name: p.name ? normalizeApostrophes(p.name) : p.name,
  }));
}

export interface SIPlayerMatchStat {
  seasonId: number;
  seasnonName: string; // API has a typo — preserved as-is
  forName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  secondYellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

export interface SISeasonStats {
  seasonId: number;
  seasonName: string;
  teamName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

/** Fetch per-match stats for a player across all seasons. */
export async function fetchPlayerStats(
  playerId: number
): Promise<SIPlayerMatchStat[]> {
  return siFetch<SIPlayerMatchStat[]>(`/players/${playerId}/stats`);
}

/** Roll up per-match data into per-season totals, newest first. */
export function aggregateSeasonStats(
  matches: SIPlayerMatchStat[]
): SISeasonStats[] {
  const map = new Map<string, SISeasonStats>();
  for (const m of matches) {
    const key = `${m.seasonId}__${m.forName}`;
    if (!map.has(key)) {
      map.set(key, {
        seasonId: m.seasonId,
        seasonName: m.seasnonName,
        teamName: m.forName,
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      });
    }
    const s = map.get(key)!;
    if (m.minutesPlayed > 0) s.appearances++;
    s.goals += m.goals;
    s.assists += m.assists;
    s.yellowCards += m.yellowCards + m.secondYellowCards;
    s.redCards += m.redCards;
  }
  return [...map.values()].sort((a, b) => b.seasonId - a.seasonId);
}

/** Fetch a player's full profile and stats. */
export async function fetchPlayerProfile(
  playerId: number,
  locale: Locale = 'da'
): Promise<SIPlayerProfile> {
  const profile = await siFetch<SIPlayerProfile>(
    `/players/${playerId}/profile`,
    { locale }
  );
  return profile.name
    ? { ...profile, name: normalizeApostrophes(profile.name) }
    : profile;
}

// ── Team form ─────────────────────────────────────────────────────────────────

export interface TeamFormResult {
  eventId: number;
  startDate: string;
  opponentId: number;
  opponentName: string;
  score: string;
  isHome: boolean;
  outcome: 'W' | 'D' | 'L';
}

/**
 * Returns the last `limit` finished results for a team, oldest-first.
 * Pass `beforeDate` (YYYY-MM-DD) to exclude the current match itself.
 */
export async function fetchTeamForm(
  teamId: number,
  options: { beforeDate?: string; limit?: number; locale?: Locale } = {}
): Promise<TeamFormResult[]> {
  const { limit = 5, locale = 'da' } = options;

  const toDate = options.beforeDate ?? new Date().toISOString().slice(0, 10);

  const fromDate = new Date(
    new Date(toDate).getTime() - 365 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const data = await siFetch<{ events: SIEvent[] }>('/events-v2', {
    teamId,
    sportId: 1,
    limit: 60,
    locale,
    fromDate,
    toDate,
  });

  // API returns ASC; reverse to newest-first, take the most recent N, then
  // reverse again so the component receives oldest-first for left→right display.
  const recent = (data.events ?? [])
    .filter((e) => e.statusType === 'finished' && e.score)
    .reverse()
    .slice(0, limit)
    .reverse();

  return recent.map((e) => {
    const isHome = e.homeId === teamId;
    const opponentName = isHome ? e.awayName : e.homeName;
    const opponentId = isHome ? e.awayId : e.homeId;
    const scoreStr = formatEventScore(e.score) ?? '0-0';
    const [homeGoals, awayGoals] = scoreStr.split('-').map(Number);
    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;
    const outcome: 'W' | 'D' | 'L' =
      teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D';
    return {
      eventId: e.eventId,
      startDate: e.startDate,
      opponentId,
      opponentName,
      score: scoreStr,
      isHome,
      outcome,
    };
  });
}

// ── Highlights ────────────────────────────────────────────────────────────────

export type HighlightSource = 'youtube' | '23video';

/** Fetch video highlights for AB — optionally filtered by event. */
export async function fetchABHighlights(
  source?: HighlightSource,
  eventId?: number
): Promise<SIHighlight[]> {
  return siFetch<SIHighlight[]>('/highlights', {
    teamId: abConfig.teamId,
    seasonId: abConfig.seasonId ?? undefined,
    source,
    eventId,
  });
}
