'use client';

import { useSession } from '@descope/nextjs-sdk/client';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from 'next-view-transitions';
import { useState } from 'react';

import { LocaleSwitcher } from '../locale-switcher';
import { NavbarItem } from './navbar-item';
import { Logo } from '@/components/logo';

type Props = {
  leftNavbarItems: { URL: string; text: string; target?: string }[];
  rightNavbarItems: { URL: string; text: string; target?: string }[];
  logo: any;
  locale: string;
};

export const DesktopNavbar = ({ leftNavbarItems, rightNavbarItems, logo, locale }: Props) => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useSession();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 60));

  return (
    <motion.div
      className="w-full flex items-center justify-between px-6 py-4 transition-colors duration-300"
      animate={{
        background: scrolled ? 'rgba(10,10,9,0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,106,82,0.3)' : '1px solid transparent',
      }}
      style={{ backdropFilter: scrolled ? 'blur(12px)' : 'none' }}
    >
      {/* Left — logo + nav links */}
      <div className="flex items-center gap-6">
        <Logo locale={locale} image={logo?.image} />
        <nav className="flex items-center gap-1">
          {leftNavbarItems.map((item) => (
            <NavbarItem
              href={`/${locale}${item.URL}` as never}
              key={item.text}
              target={item.target}
            >
              {item.text}
            </NavbarItem>
          ))}
        </nav>
      </div>

      {/* Right — locale + auth */}
      <div className="flex items-center gap-3">
        <LocaleSwitcher currentLocale={locale} />

        {rightNavbarItems.map((item) => (
          <NavbarItem href={`/${locale}${item.URL}` as never} key={item.text}>
            {item.text}
          </NavbarItem>
        ))}

        {isAuthenticated ? (
          <Link
            href={`/${locale}/konto/profil`}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors"
            style={{
              color: 'var(--ab-gold)',
              letterSpacing: '0.12em',
              border: '1px solid rgba(214,160,42,0.3)',
            }}
          >
            Min konto
          </Link>
        ) : (
          <Link
            href={`/${locale}/konto`}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2 text-white transition-all hover:text-white"
            style={{
              letterSpacing: '0.12em',
              background: 'var(--ab-green)',
              border: '1px solid var(--ab-green)',
            }}
          >
            {locale === 'da' ? 'Log ind' : 'Sign in'}
          </Link>
        )}
      </div>
    </motion.div>
  );
};
