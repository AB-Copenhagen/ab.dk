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
  {
    id: -4,
    name: 'Steven Bala',
    position: 'forward',
    shirtNumber: 17,
    birthDate: '2003-11-19',
    height: 171,
    countryName: { da: 'Engelsk/Albansk', en: 'English/Albanian' },
    formerClubs: 'FC Kitzbühel, QPR U21',
    bio: {
      en: "Steven Bala is an English/Albanian offensive player who received his football education in England, where he played U18 at Barnet FC and later both U18 and U21 at QPR. He is a technically skilled player who can cover multiple positions on the front line and contributes with creativity and ball control in offensive play. Bala also brings international experience from Albania's U21 national team. He is known as a highly dedicated player who is often the first to arrive in the morning and isn't afraid to put in extra training - even on his days off.",
      da: 'Steven Bala er en engelsk/albansk offensiv spiller, der fik sin fodboldopdragelse i England, hvor han spillede U18 for Barnet FC og senere både U18 og U21 for QPR. Han er en teknisk dygtig spiller, der kan dække flere positioner på kæden, og bidrager med kreativitet og boldkontrol i det offensive spil. Bala har desuden international erfaring fra Albaniens U21-landshold. Han er kendt som en meget dedikeret spiller, der ofte er den første på træningsbanen om morgenen og ikke er bange for at lægge ekstra træning oveni - selv på sine fridage.',
    },
    quote: {
      da: 'AB er det perfekte sted for mig at gå hen',
      en: 'AB is the perfect place for me to go',
    },
  },
  {
    id: -5,
    name: 'Gabriel Noga',
    position: 'defender',
    shirtNumber: 14,
    // Bio, birth date, country, etc. pending — profile not supplied yet.
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
