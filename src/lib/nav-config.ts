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

/** True when pathname matches this nav href exactly or as a sub-path. */
export function isNavLeafActive(
  currentPath: string,
  href: string,
  enPrefix = ''
): boolean {
  const fullHref = enPrefix + href;
  if (currentPath === fullHref) return true;
  return currentPath.startsWith(`${fullHref}/`);
}

/** True when pathname matches the item or any of its dropdown children. */
export function isNavItemActive(
  currentPath: string,
  item: NavItem,
  enPrefix = ''
): boolean {
  if (isNavLeafActive(currentPath, item.href, enPrefix)) return true;

  if (item.children?.length) {
    return item.children.some((child) =>
      isNavLeafActive(currentPath, child.href, enPrefix)
    );
  }

  return false;
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
      { label: 'Billetter', href: 'https://billet.ab.dk/', external: true },
      { label: 'Shop', href: 'https://shop.ab.dk', external: true },
    ],
  },
  primary: [
    { label: 'Hold', href: '/hold' },
    { label: 'Kampe', href: '/kampe' },
    { label: 'Nyheder', href: '/nyheder' },
    {
      label: 'Om',
      href: '/om/historik',
      children: [
        { label: 'Historik', href: '/om/historik' },
        { label: 'Stadion', href: '/om/stadion' },
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
        { label: 'Fællesskab', href: '/om/faellesskab' },
        { label: 'Watch Parties', href: '/bliv-involveret/watch-parties' },
        { label: 'Partnere', href: '/partnere' },
        { label: 'Arrangementer', href: '/events' },
        { label: 'Gæsteoplevelser', href: '/hospitality' },
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
      { label: 'Tickets', href: 'https://billet.ab.dk/', external: true },
      { label: 'Shop', href: 'https://shop.ab.dk', external: true },
    ],
  },
  primary: [
    { label: 'Squad', href: '/squad' },
    { label: 'Matches', href: '/matches' },
    { label: 'News', href: '/news' },
    {
      label: 'About',
      href: '/about/history',
      children: [
        { label: 'History', href: '/about/history' },
        { label: 'Stadium', href: '/about/stadium' },
        { label: 'Leadership', href: '/about/leadership' },
        { label: 'Media Resources', href: '/om/medier' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      label: 'Get Involved',
      href: '/bliv-involveret',
      children: [
        { label: 'Join MyAB', href: '/bliv-involveret/myab' },
        { label: 'Community', href: '/om/faellesskab' },
        { label: 'Watch Parties', href: '/bliv-involveret/watch-parties' },
        { label: 'Partners', href: '/partners' },
        { label: 'Events', href: '/events' },
        { label: 'Hospitality', href: '/hospitality' },
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
