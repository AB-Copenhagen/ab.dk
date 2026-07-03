export interface StaffMember {
  slug: string;
  name: string;
  photo: string;
  role: { da: string; en: string };
  nationality: { da: string; en: string };
}

export const COACHING_STAFF: StaffMember[] = [
  {
    slug: 'fannar-berg-gunnolfsson',
    name: 'Fannar Berg Gunnólfsson',
    photo: '/api/media/players/fannar-berg-gunnolfsson.png',
    role: { da: 'Cheftræner', en: 'Head Coach' },
    nationality: { da: 'Islandsk', en: 'Icelandic' },
  },
  {
    slug: 'benjamin-chor',
    name: 'Benjamin Chor',
    photo: '/api/media/players/benjamin-chor.png',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
  {
    slug: 'jussi-kontinen',
    name: 'Jussi Kontinen',
    photo: '/api/media/players/jussi-kontinen.png',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Svensk, Finsk', en: 'Swedish, Finnish' },
  },
  {
    slug: 'joakim-sternas',
    name: 'Joakim Sternas',
    photo: '/api/media/players/joakim-sternas.png',
    role: { da: 'Målmandstræner', en: 'Goalkeeping Coach' },
    nationality: { da: 'Svensk', en: 'Swedish' },
  },
  {
    slug: 'konstantinos-ntolaptsis',
    name: 'Konstantinos Ntolaptsis',
    photo: '/api/media/players/konstantinos-ntolaptsis.png',
    role: { da: 'Fysisk træner', en: 'Fitness Coach' },
    nationality: { da: 'Græsk', en: 'Greek' },
  },
  {
    slug: 'andreas-sondergaard',
    name: 'Andreas Søndergaard',
    photo: '/api/media/players/andreas-sondergaard.png',
    role: { da: 'Fysioterapeut', en: 'Physiotherapist' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
  {
    slug: 'albert-kaarnoe',
    name: 'Albert Kaarnøe',
    photo: '/api/media/players/albert-kaarnoe.png',
    role: { da: 'Fysioterapeut', en: 'Physiotherapist' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
  {
    slug: 'kim-villy-nielsen',
    name: 'Kim Villy Nielsen',
    photo: '/api/media/players/kim-villy-nielsen.png',
    role: { da: 'Materialemand', en: 'Kit Manager' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
  {
    slug: 'allan-petersen',
    name: 'Allan Petersen',
    photo: '/api/media/players/allan-petersen.png',
    role: { da: 'Materialemand', en: 'Kit Manager' },
    nationality: { da: 'Dansk', en: 'Danish' },
  },
];

/** Returns the first two initials from a full name, e.g. "Fannar Berg Gunnólfsson" → "FB" */
export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
