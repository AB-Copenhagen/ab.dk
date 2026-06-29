/**
 * SportsInnovation API client for AB 1889.
 *
 * All functions are server-only — do not import in Client Components.
 * The access token is injected server-side and never sent to the browser.
 *
 * API docs: https://ss2.tjekscores.dk/superliga-docs/#
 */

import { abConfig, siConfig } from '../config/ab';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Locale = 'da' | 'en';

export type EventStatus = 'notstarted' | 'inprogress' | 'finished' | 'cancelled';

export interface SIEvent {
  eventId: number;
  startDate: string;
  statusType: EventStatus;
  statusFull: string;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  score: string | null;
  detailedScore: string | null;
  tournamentName: string;
  tournamentId: number;
  sportId: number;
  properties?: {
    venue?: string;
  };
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
  nationality: string;
  dateOfBirth?: string;
  stats?: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
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
  const url = new URL(`${siConfig.baseUrl}${path}`);
  url.searchParams.set('access_token', siConfig.accessToken);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`SI API error ${res.status} on ${path}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ── Events (fixtures & results) ───────────────────────────────────────────────

export interface FetchEventsParams {
  fromDate?: string;
  toDate?: string;
  round?: number;
  status?: EventStatus;
  limit?: number;
  locale?: Locale;
}

/** Fetch AB's fixtures and results for the current season. */
export async function fetchABEvents(
  params: FetchEventsParams = {}
): Promise<SIEvent[]> {
  return siFetch<SIEvent[]>('/events-v2', {
    teamId: abConfig.teamId,
    tournamentId: abConfig.tournamentId ?? undefined,
    seasonId: abConfig.seasonId ?? undefined,
    sportId: 1, // Soccer
    limit: 100,
    locale: params.locale ?? 'da',
    ...params,
  });
}

/** Fetch a single event by ID. */
export async function fetchEvent(
  eventId: number,
  locale: Locale = 'da'
): Promise<SIEvent> {
  const events = await siFetch<SIEvent[]>('/events-v2', {
    eventId,
    locale,
  });
  const event = events[0];
  if (!event) throw new Error(`Event ${eventId} not found`);
  return event;
}

/** Fetch match incidents (goals, cards, substitutions) for an event. */
export async function fetchEventIncidents(eventId: number): Promise<SIIncident[]> {
  return siFetch<SIIncident[]>(`/events/${eventId}/incidents`);
}

// ── Standings ─────────────────────────────────────────────────────────────────

/** Fetch the current 1.division standings table. */
export async function fetchStandings(locale: Locale = 'da') {
  if (!abConfig.tournamentId) {
    throw new Error('AB_TOURNAMENT_ID is not set — standings unavailable');
  }
  return siFetch(`/tournaments/${abConfig.tournamentId}/season`, { locale });
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

/** Fetch a player's full profile and stats. */
export async function fetchPlayerProfile(
  playerId: number,
  locale: Locale = 'da'
): Promise<SIPlayerProfile> {
  return siFetch<SIPlayerProfile>(`/player/${playerId}/profile`, { locale });
}

/** Fetch all players for the current AB season. */
export async function fetchABPlayers(locale: Locale = 'da') {
  return siFetch('/players', {
    ttId: abConfig.tournamentId ?? undefined,
    seasonId: abConfig.seasonId ?? undefined,
    locale,
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
