// Shared squad-roster pipeline: fetches SI players, then applies the same
// cleanup every squad view needs — excluding departed players, overriding
// stale shirt numbers, and merging in players not yet synced by SI. Keeping
// this in one place means every squad view (homepage, /hold, /en/squad)
// stays in sync with the exclusion/override source of truth.
import { type Locale, type SIPlayer, fetchABPlayers } from './client';
import { EXCLUDED_PLAYER_SLUGS } from './player-photos';
import { manualPlayersAsSIPlayers } from '@/data/manual-players';
import { resolvePosition, resolveShirtNumber } from '@/data/player-cms-data';

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getSquadPlayers(locale: Locale): Promise<SIPlayer[]> {
  let players: SIPlayer[] = [];
  try {
    const raw = await fetchABPlayers(locale);
    players = raw
      .filter((p) => !p.name || !EXCLUDED_PLAYER_SLUGS.has(slugifyName(p.name)))
      .map((p) => ({
        ...p,
        shirtNumber: resolveShirtNumber(p.id, p.shirtNumber),
        position: (resolvePosition(p.id, p.position) ??
          p.position) as SIPlayer['position'],
      }));
  } catch {
    /* SI unavailable */
  }

  return [...players, ...manualPlayersAsSIPlayers()];
}
