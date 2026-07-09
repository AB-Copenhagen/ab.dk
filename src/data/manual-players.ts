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
  birthDate: string;
  height?: number;
  countryName: { da: string; en: string };
  nickname?: string;
  formerClubs?: string;
  bio: { da: string; en: string };
  quote?: { da: string; en: string };
}

export const MANUAL_PLAYERS: ManualPlayer[] = [
  {
    id: -1,
    name: 'Mikkel Clement',
    position: 'midfielder',
    shirtNumber: 21,
    birthDate: '2004-05-05',
    height: 188,
    countryName: { da: 'Danmark', en: 'Denmark' },
    nickname: 'Clemme',
    formerClubs: 'VSK Aarhus, Odder IGF',
    bio: {
      da: 'Jeg kan godt lide at spille golf og følger med i sporten. Ud over det så bruger jeg meget tid med familie og venner.',
      en: 'I enjoy playing golf and keeping up with the sport. Outside of that, I spend most of my free time with family and friends.',
    },
    quote: {
      da: 'Aldrig mist troen',
      en: 'Never lose faith',
    },
  },
  {
    id: -2,
    name: 'William Warrer',
    position: 'defender',
    shirtNumber: 33,
    birthDate: '2007-04-04',
    height: 191,
    countryName: { da: 'Danmark', en: 'Denmark' },
    nickname: 'Warrer',
    formerClubs: 'Kolding IF U19, Randers FC Youth',
    bio: {
      da: 'Når jeg ikke er på banen går jeg meget op i golf og cykling og er stor fan af at optimere min krop så meget som muligt og jagte de små procenter.',
      en: "When I'm not on the pitch, I enjoy golf and cycling. I'm passionate about optimizing my body and constantly chasing those small percentage gains that can make a big difference.",
    },
    quote: {
      da: 'Hårdt arbejde og besættelse vinder altid',
      en: 'Hard work and obsession always wins',
    },
  },
  {
    id: -3,
    name: 'Saliou Diop',
    position: 'forward',
    shirtNumber: 29,
    birthDate: '2005-12-05',
    height: 187,
    countryName: { da: 'Senegal', en: 'Senegal' },
    nickname: 'Saliou',
    formerClubs: 'Stade Brestois, Brest B',
    bio: {
      da: 'Saliou er en stærk, teknisk spiller og en kynisk afslutter.',
      en: 'Saliou is a powerful, technical player and a clinical finisher.',
    },
    quote: {
      da: 'Ingen smerte, ingen vinding',
      en: 'No pain, no gain',
    },
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
    birthDate: p.birthDate,
    country: null,
  }));
}
