export interface StaffMember {
  slug: string;
  name: string;
  photo: string;
  role: { da: string; en: string };
  nationality: { da: string; en: string };
  bio?: { da: string; en: string };
}

export const COACHING_STAFF: StaffMember[] = [
  {
    slug: 'fannar-berg-gunnolfsson',
    name: 'Fannar Berg Gunnólfsson',
    photo: '/api/media/players/fannar-berg-gunnolfsson.png',
    role: { da: 'Cheftræner', en: 'Head Coach' },
    nationality: { da: 'Islandsk', en: 'Icelandic' },
    bio: {
      en: 'Berg Gunnólfsson was hired as head coach of AB on November 15, 2025. Prior to his appointment, he was an assistant coach at AB. Additionally, he has experience from both senior and youth football in Iceland and Norway. Before AB, he was head coach for Volde Turn og Idrottslag and assistant coach for Knattspyrnufélag ÍA.',
      da: 'Berg Gunnólfsson blev ansat som cheftræner for AB den 15. november 2025. Forud for sin ansættelse var han assistenttræner i AB. Derudover har han erfaring fra både senior- og ungdomsfodbold i Island og Norge. Inden AB var han cheftræner for Volde Turn og Idrottslag og assistenttræner for Knattspyrnufélag ÍA.',
    },
  },
  {
    slug: 'benjamin-chor',
    name: 'Benjamin Chor',
    photo: '/api/media/players/benjamin-chor.png',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Dansk', en: 'Danish' },
    bio: {
      en: "Benjamin Chor has over 10 years of coaching experience and was most recently assistant coach at Fremad Amager from March 2024 to March 2025. He worked as an academy coach at FK Bodø/Glimt in Norway between 2022–2024 and was also head coach for Brøndby's U13 team from 2020–21.",
      da: 'Benjamin Chor har over 10 års trænerfaring og var senest assistenttræner i Fremad Amager fra marts 2024 til marts 2025. Han arbejdede som akademitræner i FK Bodø/Glimt i Norge i perioden 2022–2024 og var desuden cheftræner for Brøndbys U13-hold i 2020–21.',
    },
  },
  {
    slug: 'jussi-kontinen',
    name: 'Jussi Kontinen',
    photo: '/api/media/players/jussi-kontinen.png',
    role: { da: 'Assistenttræner', en: 'Assistant Coach' },
    nationality: { da: 'Svensk, Finsk', en: 'Swedish, Finnish' },
    bio: {
      en: 'Jussi Kontinen has a UEFA Pro license and over 20 years of coaching experience. He was most recently head coach for Lunds BK in the Swedish Division 1 Södra from 2022–25. In the 2021 season, he was assistant coach in the Allsvenskan for Östersunds FK and also has previous experience as an academy coach at IFK Göteborg.',
      da: 'Jussi Kontinen har en UEFA Pro-licens og over 20 års trænerfaring. Han var senest cheftræner for Lunds BK i den svenske Division 1 Södra fra 2022–25. I sæsonen 2021 var han assistenttræner i Allsvenskan for Östersunds FK og har desuden erfaring som akademitræner i IFK Göteborg.',
    },
  },
  {
    slug: 'joakim-sternas',
    name: 'Joakim Sternas',
    photo: '/api/media/players/joakim-sternas.png',
    role: { da: 'Målmandstræner', en: 'Goalkeeping Coach' },
    nationality: { da: 'Svensk', en: 'Swedish' },
    bio: {
      en: 'Sternas joined AB as goalkeeping coach after two years as head goalkeeping coach at Täby FK in the Swedish Ettan Norra. He started his coaching career at Spånga IS FK.',
      da: 'Sternas tiltrådte AB som målmandstræner efter to år som chefmålmandstræner i Täby FK i den svenske Ettan Norra. Han startede sin trænerbane i Spånga IS FK.',
    },
  },
  {
    slug: 'konstantinos-ntolaptsis',
    name: 'Konstantinos Ntolaptsis',
    photo: '/api/media/players/konstantinos-ntolaptsis.png',
    role: { da: 'Fysisk træner', en: 'Fitness Coach' },
    nationality: { da: 'Græsk', en: 'Greek' },
    bio: {
      en: "Ntolaptsis is the fitness coach for the first team and joined AB in July 2025. He was previously a performance and fitness coach for FC Würzburger, where he worked with their U19 team. He holds a master's degree in Exercise Science & Training from Julius-Maximilians-University in Würzburg and a bachelor's degree in sports science from Aristotle University of Thessaloniki.",
      da: 'Ntolaptsis er første holds fysiske træner og tiltrådte AB i juli 2025. Han var tidligere performance- og fitness-coach for FC Würzburger, hvor han arbejdede med U19-holdet. Han har en kandidatgrad i Exercise Science & Training fra Julius-Maximilians-Universität i Würzburg og en bachelorgrad i sportvidenskab fra Aristoteles Universitetet i Thessaloniki.',
    },
  },
  {
    slug: 'andreas-sondergaard',
    name: 'Andreas Søndergaard',
    photo: '/api/media/players/andreas-sondergaard.png',
    role: { da: 'Fysioterapeut', en: 'Physiotherapist' },
    nationality: { da: 'Dansk', en: 'Danish' },
    bio: {
      en: 'Søndergaard joined AB in April 2023 as head physio for the senior team, as well as working with the U19 and U17 Academy teams. Before that, he spent 10 seasons as head physio for the Copenhagen Towers in the Danish American Football league. During his time there, he was part of the team that secured 6 national championships and 1 Northern European Champions league title. He has also worked with both the Senior and U17 American football national teams.',
      da: 'Søndergaard kom til AB i april 2023 som cheffysioterapeut for førsteholdet samt for U19- og U17-akademiholdene. Forinden tilbragte han 10 sæsoner som cheffysioterapeut for Copenhagen Towers i den danske liga i american football. I den periode var han en del af holdet, der vandt 6 danske mesterskaber og 1 nordeuropæisk Champions League-titel. Han har desuden arbejdet med både senior- og U17-landsholdene i american football.',
    },
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

/** Returns first + last initial, e.g. "Fannar Berg Gunnólfsson" → "FG" */
export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}
