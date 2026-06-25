'use client';

import { DesktopNavbar } from './desktop-navbar';
import { MobileNavbar } from './mobile-navbar';

type Props = {
  data: any;
  locale: string;
  hasBanner?: boolean;
};

export function Navbar({ data, locale, hasBanner }: Props) {
  const top = hasBanner ? 'top-[4.25rem]' : 'top-0';

  return (
    <header className={`fixed inset-x-0 ${top} z-50`}>
      <div className="hidden lg:block">
        <DesktopNavbar locale={locale} logo={data?.logo} />
      </div>
      <div className="lg:hidden">
        <MobileNavbar locale={locale} logo={data?.logo} />
      </div>
    </header>
  );
}
