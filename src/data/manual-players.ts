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
  // it until that row is cleaned up in Strapi; -2 is the next safe ID.
  {
    id: -2,
    name: 'Jermain Fernandes',
    position: 'forward',
    shirtNumber: 77,
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
