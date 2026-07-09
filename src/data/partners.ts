export type PartnerTier = 'principal' | 'network';

export interface Partner {
  slug: string;
  name: string;
  logo: string;
  /** Tailwind sizing class used on the list-page cards */
  logoSize?: string;
  website?: string;
  tier: PartnerTier;
  description?: string;
  howLong?: string;
  highlights?: string;
}

export const PARTNERS: Partner[] = [
  // ── Principal partners ──────────────────────────────────────────────────────
  {
    slug: 'myriad360',
    name: 'Myriad360',
    logo: '/images/sponsors/myriad360.png',
    logoSize: 'w-[230px] h-[78px]',
    website: 'https://myriad360.com/',
    tier: 'principal',
  },
  {
    slug: 'plane',
    name: 'Plane',
    logo: '/images/sponsors/plane.png',
    logoSize: 'w-[200px] h-[65px]',
    website: 'https://plane.so/',
    tier: 'principal',
    description: 'Plane brings projects, docs, and AI-powered workflows into one unified workspace so teams and agents can plan, execute, and stay aligned. Plane is project management and knowledge management for teams and agents.',
  },
  {
    slug: 'datum',
    name: 'Datum',
    logo: '/images/sponsors/datum.png',
    logoSize: 'w-[300px] h-[100px]',
    website: 'https://datum.net/',
    tier: 'principal',
    description: "Datum is an 'open network cloud' designed to unlock internet superpowers (e.g. advanced network and connectivity services) for every agent, app, and builder. Unlike a traditional CDN or hyperscaler cloud: 100% focused on modern, \"alt cloud\" service providers; code is open source (AGPLv3) so you can run it anywhere if needed. Prioritizing agent-first and developer experiences.",
  },
  {
    slug: 'select-sport',
    name: 'Select Sport',
    logo: '/images/sponsors/select-sport.png',
    logoSize: 'w-[200px] h-[65px]',
    website: 'https://dk.select-sport.com/',
    tier: 'principal',
  },
  {
    slug: 'carlsberg',
    name: 'Carlsberg',
    logo: '/images/sponsors/carlsberg.png',
    logoSize: 'w-[262px] h-[88px]',
    website: 'https://carlsbergdanmark.dk/',
    tier: 'principal',
  },

  // ── Network partners ────────────────────────────────────────────────────────
  { slug: 't4c',                              name: 'T4C A/S',                           logo: '/images/sponsors/partners/t4c.jpg',                             tier: 'network' },
  { slug: 'ks-jydekrogen',                    name: 'K/S Jydekrogen',                    logo: '/images/sponsors/partners/ks-jydekrogen.png',                   tier: 'network' },
  { slug: 'fodeksperterne',                   name: 'Fodeksperterne',                    logo: '/images/sponsors/partners/fodeksperterne.png',                  tier: 'network' },
  { slug: 'weibel-data',                      name: 'Weibel Data og overvågning',        logo: '/images/sponsors/partners/weibel-data.png',                     tier: 'network' },
  { slug: 'unisport',                         name: 'Unisport',                          logo: '/images/sponsors/partners/unisport.png',                        tier: 'network' },
  { slug: 'lomax',                            name: 'Lomax',                             logo: '/images/sponsors/partners/lomax.jpeg',                          tier: 'network' },
  { slug: 'waseen',                           name: 'Waseen',                            logo: '/images/sponsors/partners/waseen.jpeg',                         tier: 'network' },
  { slug: 'steaking',                         name: 'Steaking',                          logo: '/images/sponsors/partners/steaking.jpg',                        tier: 'network' },
  { slug: 'kasper-svenstrup-media',           name: 'Kasper Svenstrup Media',            logo: '/images/sponsors/partners/kasper-svenstrup-media.png',          tier: 'network' },
  { slug: 'poul-holm-sport',                  name: 'Poul Holm Sport',                   logo: '/images/sponsors/partners/poul-holm-sport.gif',                 tier: 'network' },
  { slug: 'lind-advokater',                   name: 'Lind Advokater',                    logo: '/images/sponsors/partners/lind-advokater.png',                  tier: 'network' },
  { slug: 'laudrup-vin',                      name: 'Laudrup Vin',                       logo: '/images/sponsors/partners/laudrup-vin.png',                     tier: 'network' },
  { slug: 'symbion',                          name: 'Symbion',                           logo: '/images/sponsors/partners/symbion.png',                         tier: 'network' },
  { slug: 'pure-shots',                       name: 'Pure Shots',                        logo: '/images/sponsors/partners/pure-shots.png',                      tier: 'network' },
  { slug: 'baker-tilly',                      name: 'Baker Tilly',                       logo: '/images/sponsors/partners/baker-tilly.png',                     tier: 'network' },
  { slug: 'virum-torv-advokater',             name: 'Virum Torv Advokater',              logo: '/images/sponsors/partners/virum-torv-advokater.svg',            tier: 'network' },
  { slug: 'soccerzoom',                       name: 'SoccerZoom',                        logo: '/images/sponsors/partners/soccerzoom.png',                      tier: 'network' },
  { slug: 'apo-pharm',                        name: 'Apo Pharm',                         logo: '/images/sponsors/partners/apo-pharm.png',                       tier: 'network' },
  { slug: 'plus-leasing',                     name: 'Plus Leasing',                      logo: '/images/sponsors/partners/plus-leasing.png',                    tier: 'network' },
  { slug: 'dancontainer',                     name: 'Dancontainer',                      logo: '/images/sponsors/partners/dancontainer.jpg',                    tier: 'network' },
  { slug: 'soepromenaden',                    name: 'Søpromenaden',                      logo: '/images/sponsors/partners/soepromenaden.webp',                  tier: 'network' },
  { slug: 'view2net',                         name: 'View2net',                          logo: '/images/sponsors/partners/view2net.png',                        tier: 'network' },
  { slug: 'buffetkompagniet',                 name: 'Buffetkompagniet',                  logo: '/images/sponsors/partners/buffetkompagniet.png',                tier: 'network' },
  { slug: 'weibel-el-teknik',                 name: 'Weibel El-teknik',                  logo: '/images/sponsors/partners/weibel-el-teknik.png',                tier: 'network' },
  { slug: 'meny-kaffe',                       name: 'Meny Kaffe',                        logo: '/images/sponsors/partners/meny-kaffe.png',                      tier: 'network' },
  { slug: 'nordsjaelland-sportsfysioterapi',  name: 'Nordsjælland Sportsfysioterapi',    logo: '/images/sponsors/partners/nordsjaelland-sportsfysioterapi.png', tier: 'network' },
  { slug: 'meny-soeborg',                     name: 'Meny Søborg',                       logo: '/images/sponsors/partners/meny-soeborg.png',                    tier: 'network' },
  { slug: 'capio-privathospital',             name: 'Capio Privathospital',              logo: '/images/sponsors/partners/capio-privathospital.png',            tier: 'network' },
  { slug: 'bella-skilte-print',               name: 'Bella — Skilte & Print',            logo: '/images/sponsors/partners/bella-skilte-print.png',              tier: 'network' },
  { slug: 'ejendomsfoto',                     name: 'Ejendomsfoto',                      logo: '/images/sponsors/partners/ejendomsfoto.png',                    tier: 'network' },
];

export const principalPartners = PARTNERS.filter((p) => p.tier === 'principal');
export const networkPartners = PARTNERS.filter((p) => p.tier === 'network');

export function findPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
