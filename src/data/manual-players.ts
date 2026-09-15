// Players not yet registered in the SI API roster (SportsInnovation hasn't
// synced them onto the team yet). Assigned synthetic negative IDs — SI player
// IDs are always positive — so squad cards and detail routes work the same
// way as SI-sourced players. Once SI adds a real entry for a player, remove
// them here and add their bio to PLAYER_CMS_DATA (src/data/player-cms-data.ts)
// keyed by their real SI player ID instead.
import type { PlayerPosition, SIPlayer } from '@/lib/si/client';

export interface ManualPlayer {
  id: number;
  name: string;
  position: PlayerPosition;
  shirtNumber: number;
  /**
   * The player's real SI-assigned id, when SI already has a profile for them
   * (i.e. `/players/{siPlayerId}/profile` resolves) even though SI's team
   * roster/members endpoint doesn't return them yet. Purely informational —
   * shown on the SI roster debug page so it reflects SI's real id instead of
   * the synthetic `id` below. Squad merging, routing, and this player's own
   * detail-page URL still key off the synthetic `id`.
   */
  siPlayerId?: number;
  /** Omit while the player's full profile (bio, birth date, etc.) hasn't been supplied yet. */
  birthDate?: string;
  height?: number;
  countryName?: { da: string; en: string };
  nickname?: string;
  formerClubs?: string;
  bio?: { da: string; en: string };
  quote?: { da: string; en: string };
}

export const MANUAL_PLAYERS: ManualPlayer[] = [
  // NOTE: -1 is currently squatted by a stale, orphaned Strapi player override
  // row (siPlayerId: -1, EN locale only, displayNameOverride "Aidan Liu")
  // left behind when Aidan Liu synced to SI for real and was removed from
  // this array — nobody deleted the Strapi row. Using -1 again silently
  // pulls in that dead override (wrong name/shirt/position on EN only). Skip
  // it until that row is cleaned up in Strapi. -2 was freed up the same way
  // (Jermain Fernandes, removed 2026-09-15 once SI's roster started
  // returning him for real) — check Strapi for a similarly orphaned override
  // row at siPlayerId -2 before reusing it; -4 is the next id with no known
  // history either way.
  // Has an SI player profile (siPlayerId 1413477, /players/1413477/profile
  // resolves fine — Strapi Player override is keyed to that real ID) but SI
  // still hasn't added him to AB's team roster/members list, so
  // fetchABPlayers doesn't return him and he's absent from squad listings.
  // Confirmed 2026-09-15 after a prior removal of this same entry turned out
  // to be premature. Remove this entry once fetchABPlayers actually returns
  // him (squad.ts's name-match dedup will also drop it automatically then).
  {
    id: -3,
    siPlayerId: 1413477,
    name: 'Marius Stenner',
    position: 'defender',
    shirtNumber: 17,
    birthDate: '2004-06-28',
  },
];

export function findManualPlayer(id: number): ManualPlayer | undefined {
  return MANUAL_PLAYERS.find((p) => p.id === id);
}

/** Manual players in SIPlayer shape, for merging into SI-sourced squad lists. */
export function manualPlayersAsSIPlayers(): SIPlayer[] {
  return MANUAL_PLAYERS.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    shirtNumber: p.shirtNumber,
    birthDate: p.birthDate ?? null,
    country: null,
  }));
}
