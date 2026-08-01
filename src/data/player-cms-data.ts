// Static player CMS data — used as a per-player fallback only for a player
// whose SI ID has no row yet in Strapi's `player` content type (see
// AGENTS.md's "Managing player overrides" section). Keyed by SI player ID.
import type { PlayerPosition } from '@/lib/si/client';

export interface StaticPlayerEntry {
  nickname?: string;
  formerClubs?: string;
  bio?: { da: string; en: string };
  quote?: { da: string; en: string };
  /**
   * Overrides a stale shirt number from the SI API — e.g. when a player
   * changes number mid-season and SI hasn't caught up yet.
   */
  shirtNumber?: number;
  /**
   * Overrides a name from the SI API that's missing Danish characters
   * (e.g. "Soeren Ilsoee" instead of "Søren Ilsøe").
   */
  name?: string;
  /** Overrides a stale/incorrect position from the SI API. */
  position?: PlayerPosition;
}

/** Prefers a manual shirt-number override over the (possibly stale) SI API value. */
export function resolveShirtNumber(
  siPlayerId: number,
  apiShirtNumber: number | null
): number | null {
  return PLAYER_CMS_DATA[siPlayerId]?.shirtNumber ?? apiShirtNumber;
}

/** Prefers a manual name override over the (possibly ASCII-mangled) SI API value. */
export function resolveName(
  siPlayerId: number,
  apiName: string | null
): string | null {
  return PLAYER_CMS_DATA[siPlayerId]?.name ?? apiName;
}

/** Prefers a manual position override over the (possibly stale) SI API value. */
export function resolvePosition(
  siPlayerId: number,
  apiPosition: string | null
): string | null {
  return PLAYER_CMS_DATA[siPlayerId]?.position ?? apiPosition;
}

// Matches the ASCII transliteration the SI API itself already uses for these
// letters elsewhere (e.g. "Søren" -> "Soeren") — so a corrected name with
// Danish characters still slugifies the same way an SI-sourced ASCII name would.
function transliterateDanish(name: string): string {
  return name
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'oe')
    .replace(/[åÅ]/g, 'aa');
}

export function slugify(name: string): string {
  return transliterateDanish(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Builds the `{id}-{slug}` URL segment for a player's detail page, using the
 * corrected display name so the URL doesn't repeat a truncated/mangled SI name.
 * The leading id is what actually resolves the page — the slug text is
 * cosmetic and safe to change without breaking existing links.
 */
export function getPlayerSlug(
  siPlayerId: number,
  apiName: string | null
): string {
  const name = resolveName(siPlayerId, apiName) ?? apiName ?? '';
  return `${siPlayerId}-${slugify(name)}`;
}

/**
 * Resolves a legacy player URL that only ever encoded the name, with no
 * leading SI id (e.g. the pre-2026-07-05 `/en/spiller/michael-stone`, since
 * renamed to `/en/player/{id}-michael-stone`) — matches by slugified name
 * against the given roster so a still-indexed old URL can redirect straight
 * to the real player instead of bouncing to the squad listing.
 */
export function findPlayerIdByNameSlug(
  players: { id: number; name: string }[],
  nameSlug: string
): number | null {
  return players.find((p) => slugify(p.name) === nameSlug)?.id ?? null;
}

// All 29 entries previously here are now live in Strapi (migrated via
// scripts/seed-player-overrides.mjs on 2026-07-30) — left empty as the
// fallback tier for any player not yet given a Strapi row.
export const PLAYER_CMS_DATA: Record<number, StaticPlayerEntry> = {};
