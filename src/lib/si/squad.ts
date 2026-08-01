// Shared squad-roster pipeline: fetches SI players, then applies the same
// cleanup every squad view needs — excluding departed/hidden players,
// overriding stale identity fields, resolving photos, and merging in players
// not yet synced by SI. Keeping this in one place means every squad view
// (homepage, /hold, /en/squad) stays in sync with the same override source.
import { type Locale, type SIPlayer, fetchABPlayers } from './client';
import {
  EXCLUDED_PLAYER_SLUGS,
  PENDING_PHOTO_SHIRT_NUMBERS,
} from './player-photos';
import { manualPlayersAsSIPlayers } from '@/data/manual-players';
import {
  resolveName,
  resolvePosition,
  resolveShirtNumber,
} from '@/data/player-cms-data';
import { abConfig } from '@/lib/config/ab';
import {
  type StrapiPlayer,
  fetchAllPlayerOverrides,
  resolvePlayerPhoto,
} from '@/lib/strapi/client';

export interface SquadPlayer extends SIPlayer {
  photoUrl: string | null;
  photoFallbackUrl: string | null;
  photoPosition: string;
  hidePhoto: boolean;
}

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘ʼ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mergePlayer(
  p: SIPlayer,
  overrides: Map<number, StrapiPlayer>
): SquadPlayer {
  const o = overrides.get(p.id);
  const name = o?.displayNameOverride ?? resolveName(p.id, p.name) ?? p.name;
  const shirtNumber =
    o?.shirtNumberOverride ?? resolveShirtNumber(p.id, p.shirtNumber);
  const position = (o?.positionOverride ??
    resolvePosition(p.id, p.position) ??
    p.position) as SIPlayer['position'];
  const hidePhoto =
    o?.hidePhoto ??
    (shirtNumber != null &&
      PENDING_PHOTO_SHIRT_NUMBERS.has(Number(shirtNumber)));
  const photo = resolvePlayerPhoto({
    hidePhoto,
    strapiPhoto: o?.photo,
    strapiPhotoPosition: o?.photoPosition,
    siName: p.name,
    siPlayerId: p.id,
    teamId: abConfig.teamId,
  });

  return { ...p, name, shirtNumber, position, hidePhoto, ...photo };
}

export async function getSquadPlayers(locale: Locale): Promise<SquadPlayer[]> {
  let players: SquadPlayer[] = [];
  let overrides: Map<number, StrapiPlayer> = new Map();
  try {
    const [raw, fetchedOverrides] = await Promise.all([
      fetchABPlayers(locale),
      fetchAllPlayerOverrides(locale),
    ]);
    overrides = fetchedOverrides;
    players = raw
      .filter((p) => {
        const o = overrides.get(p.id);
        if (o?.hideFromSquad) return false;
        // Legacy fallback — only consulted for players with no Strapi row yet.
        if (!o && p.name && EXCLUDED_PLAYER_SLUGS.has(slugifyName(p.name)))
          return false;
        return true;
      })
      .map((p) => mergePlayer(p, overrides));
  } catch {
    /* SI unavailable */
  }

  // Guards against a manual entry lingering after SI syncs the same player for
  // real (as happened with Mikkel Clement, then Gabriel Noga/Steven Bala) —
  // a name match here means SI now has its own record, so the manual one is
  // dropped rather than shown as a duplicate card.
  const siNameSlugs = new Set(
    players.filter((p) => p.name).map((p) => slugifyName(p.name as string))
  );
  const manualPlayers = manualPlayersAsSIPlayers()
    .filter((p) => !p.name || !siNameSlugs.has(slugifyName(p.name)))
    .map((p) => mergePlayer(p, overrides));

  return [...players, ...manualPlayers];
}
