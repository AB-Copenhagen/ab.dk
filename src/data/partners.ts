export type PartnerTier = 'supreme' | 'premium' | 'local-hero' | 'ab1889';

export const TIER_LABELS: Record<PartnerTier, { da: string; en: string }> = {
  supreme: { da: 'Supreme Partner', en: 'Supreme Partner' },
  premium: { da: 'Premium Partner', en: 'Premium Partner' },
  'local-hero': { da: 'Local Hero Partner', en: 'Local Hero Partner' },
  ab1889: { da: 'AB 1889 Partner', en: 'AB 1889 Partner' },
};

const PLACEHOLDER_LOGO = '/images/sponsors/partner-logo-placeholder.svg';

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
  // ── Supreme partner ──────────────────────────────────────────────────────
  {
    slug: 'datum',
    name: 'Datum',
    logo: '/images/sponsors/datum.png',
    logoSize: 'w-[300px] h-[100px]',
    website: 'https://datum.net/',
    tier: 'supreme',
    description:
      'Datum is an \'open network cloud\' designed to unlock internet superpowers (e.g. advanced network and connectivity services) for every agent, app, and builder. Unlike a traditional CDN or hyperscaler cloud: 100% focused on modern, "alt cloud" service providers; code is open source (AGPLv3) so you can run it anywhere if needed. Prioritizing agent-first and developer experiences.',
  },
  {
    slug: 'myriad360',
    name: 'Myriad 360',
    logo: '/images/sponsors/myriad360.png',
    logoSize: 'w-[230px] h-[51px]',
    website: 'https://myriad360.com/',
    tier: 'supreme',
  },

  // ── Premium partner ──────────────────────────────────────────────────────
  {
    slug: 'select',
    name: 'Select',
    logo: '/images/sponsors/select-sport.png',
    logoSize: 'w-[200px] h-[65px]',
    website: 'https://dk.select-sport.com/',
    tier: 'premium',
  },
  {
    slug: 'unisport',
    name: 'Unisport',
    logo: '/images/sponsors/unisport.png',
    logoSize: 'w-[200px] h-[65px]',
    tier: 'premium',
  },
  {
    slug: 'lind',
    name: 'LIND',
    logo: '/images/sponsors/lind-law.png',
    logoSize: 'w-[85px] h-[23px]',
    website: 'https://lindlaw.dk/',
    tier: 'premium',
  },
  {
    slug: 'ambrosia-group',
    name: 'Ambrosia Group',
    logo: PLACEHOLDER_LOGO,
    tier: 'premium',
  },
  {
    slug: 'dagrofa',
    name: 'Dagrofa',
    logo: PLACEHOLDER_LOGO,
    tier: 'premium',
  },

  // ── Local Hero partner ───────────────────────────────────────────────────
  {
    slug: 'hagelund',
    name: 'Hagelund ApS',
    logo: '/images/sponsors/partners/hagelund.png',
    tier: 'local-hero',
  },
  {
    slug: 'dancontainer',
    name: 'Dancontainer',
    logo: '/images/sponsors/partners/dancontainer.jpg',
    tier: 'local-hero',
  },

  // ── AB 1889 partner ──────────────────────────────────────────────────────
  {
    slug: 'bagerdygtigt',
    name: 'Bagerdygtigt ApS',
    logo: PLACEHOLDER_LOGO,
    tier: 'ab1889',
  },
  {
    slug: 'dva',
    name: 'DVA',
    logo: PLACEHOLDER_LOGO,
    tier: 'ab1889',
  },
  {
    slug: 'epact',
    name: 'ePact',
    logo: '/images/sponsors/partners/epact.png',
    tier: 'ab1889',
  },
  {
    slug: 'sds-rengoering',
    name: 'SDS Rengøring ApS',
    logo: PLACEHOLDER_LOGO,
    tier: 'ab1889',
  },
  {
    slug: 'plus-leasing',
    name: 'Plus Leasing',
    logo: '/images/sponsors/partners/plus-leasing.png',
    tier: 'ab1889',
  },
  {
    slug: 'travel-4-companies',
    name: 'Travel 4 Companies A/S',
    logo: '/images/sponsors/partners/t4c.jpg',
    tier: 'ab1889',
  },
  {
    slug: 'weibel-e',
    name: 'Weibel E',
    logo: '/images/sponsors/partners/weibel-el-teknik.png',
    tier: 'ab1889',
  },
  {
    slug: 'weibel-data',
    name: 'Weibel Data',
    logo: '/images/sponsors/partners/weibel-data.png',
    tier: 'ab1889',
  },
];

export const supremePartners = PARTNERS.filter((p) => p.tier === 'supreme');
export const premiumPartners = PARTNERS.filter((p) => p.tier === 'premium');
export const localHeroPartners = PARTNERS.filter(
  (p) => p.tier === 'local-hero'
);
export const ab1889Partners = PARTNERS.filter((p) => p.tier === 'ab1889');

export function findPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
