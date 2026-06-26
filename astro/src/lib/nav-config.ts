export interface PreHeaderItem {
  label: string;
  href: string;
  highlight?: boolean;
  external?: boolean;
}

export interface NavLeaf {
  label: string;
  href: string;
}

export interface NavItemSimple extends NavLeaf {
  children?: undefined;
}

export interface NavItemDropdown extends NavLeaf {
  children: NavLeaf[];
}

export type NavItem = NavItemSimple | NavItemDropdown;

export function isDropdown(item: NavItem): item is NavItemDropdown {
  return Array.isArray(item.children) && item.children.length > 0;
}

export interface NavConfig {
  preHeader: { left: PreHeaderItem[] };
  primary: NavItem[];
  login: string;
  myAccount: string;
  openMenu: string;
  closeMenu: string;
}

const da: NavConfig = {
  preHeader: {
    left: [
      { label: 'Join MyAB', href: '/da/bliv-involveret/myab', highlight: true },
      { label: 'Billetter', href: 'https://billetter.ab.dk', external: true },
      { label: 'Shop', href: 'https://shop.ab.dk', external: true },
    ],
  },
  primary: [
    { label: 'Hold', href: '/hold' },
    { label: 'Kampe', href: '/kampe' },
    { label: 'Nyheder', href: '/nyheder' },
    {
      label: 'Om AB',
      href: '/om',
      children: [
        { label: 'Historik', href: '/om/historik' },
        { label: 'Stadion', href: '/om/stadion' },
        { label: 'Fællesskab', href: '/om/faellesskab' },
        { label: 'Ledelse', href: '/om/ledelse' },
        { label: 'Medieressourcer', href: '/om/medier' },
        { label: 'Kontakt', href: '/om/kontakt' },
      ],
    },
    {
      label: 'Bliv involveret',
      href: '/bliv-involveret',
      children: [
        { label: 'Join MyAB', href: '/bliv-involveret/myab' },
        { label: 'Watch Parties', href: '/bliv-involveret/watch-parties' },
        { label: 'Sponsor', href: '/bliv-involveret/sponsor' },
        { label: 'Events', href: '/bliv-involveret/events' },
        { label: 'Hospitality', href: '/bliv-involveret/hospitality' },
      ],
    },
  ],
  login: 'Log ind',
  myAccount: 'Min konto',
  openMenu: 'Åbn menu',
  closeMenu: 'Luk menu',
};

const en: NavConfig = {
  preHeader: {
    left: [
      { label: 'Join MyAB', href: '/en/bliv-involveret/myab', highlight: true },
      { label: 'Tickets', href: 'https://billetter.ab.dk', external: true },
      { label: 'Shop', href: 'https://shop.ab.dk', external: true },
    ],
  },
  primary: [
    { label: 'Squad', href: '/hold' },
    { label: 'Fixtures', href: '/kampe' },
    { label: 'News', href: '/nyheder' },
    {
      label: 'About AB',
      href: '/om',
      children: [
        { label: 'History', href: '/om/historik' },
        { label: 'Stadium', href: '/om/stadion' },
        { label: 'Community', href: '/om/faellesskab' },
        { label: 'Leadership', href: '/om/ledelse' },
        { label: 'Media Resources', href: '/om/medier' },
        { label: 'Contact', href: '/om/kontakt' },
      ],
    },
    {
      label: 'Get Involved',
      href: '/bliv-involveret',
      children: [
        { label: 'Join MyAB', href: '/bliv-involveret/myab' },
        { label: 'Watch Parties', href: '/bliv-involveret/watch-parties' },
        { label: 'Sponsor', href: '/bliv-involveret/sponsor' },
        { label: 'Events', href: '/bliv-involveret/events' },
        { label: 'Hospitality', href: '/bliv-involveret/hospitality' },
      ],
    },
  ],
  login: 'Sign in',
  myAccount: 'My account',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
};

const configs: Record<string, NavConfig> = { da, en };

export function getNavConfig(locale: string): NavConfig {
  return configs[locale] ?? da;
}
