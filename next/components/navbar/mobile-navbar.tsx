'use client';

import { useSession } from '@descope/nextjs-sdk/client';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from 'next-view-transitions';
import { useState } from 'react';
import { IoIosClose, IoIosMenu } from 'react-icons/io';

import { LocaleSwitcher } from '../locale-switcher';
import { Logo } from '@/components/logo';

type Props = {
  leftNavbarItems: { URL: string; text: string; target?: string }[];
  rightNavbarItems: { URL: string; text: string; target?: string }[];
  logo: any;
  locale: string;
};

export const MobileNavbar = ({ leftNavbarItems, rightNavbarItems, logo, locale }: Props) => {
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useSession();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 60));

  return (
    <div
      className="flex justify-between items-center w-full px-4 py-3 transition-colors duration-300"
      style={{
        background: scrolled ? 'rgba(10,10,9,0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,106,82,0.25)' : '1px solid transparent',
      }}
    >
      <Logo locale={locale} image={logo?.image} />

      <button
        onClick={() => setOpen(true)}
        aria-label="Åbn menu"
        className="p-1"
      >
        <IoIosMenu className="text-white h-7 w-7" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'var(--rich-black)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'rgba(0,106,82,0.2)' }}
          >
            <Logo locale={locale} image={logo?.image} />
            <div className="flex items-center gap-3">
              <LocaleSwitcher currentLocale={locale} />
              <button onClick={() => setOpen(false)} aria-label="Luk menu">
                <IoIosClose className="h-8 w-8 text-white" />
              </button>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-0 px-6 pt-8 flex-1">
            {leftNavbarItems.map((item, idx) => (
              <Link
                key={idx}
                href={`/${locale}${item.URL}`}
                onClick={() => setOpen(false)}
                className="py-4 text-2xl font-bold uppercase text-white border-b transition-colors hover:text-ab-gold"
                style={{ borderColor: 'rgba(255,255,255,0.06)', letterSpacing: '-0.01em' }}
              >
                {item.text}
              </Link>
            ))}
            {rightNavbarItems.map((item, idx) => (
              <Link
                key={`r-${idx}`}
                href={`/${locale}${item.URL}`}
                onClick={() => setOpen(false)}
                className="py-4 text-2xl font-bold uppercase text-white border-b transition-colors hover:text-ab-gold"
                style={{ borderColor: 'rgba(255,255,255,0.06)', letterSpacing: '-0.01em' }}
              >
                {item.text}
              </Link>
            ))}
          </nav>

          {/* Auth CTA */}
          <div className="px-6 py-8">
            <Link
              href={`/${locale}${isAuthenticated ? '/konto/profil' : '/konto'}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ab-green)', letterSpacing: '0.12em' }}
            >
              {isAuthenticated
                ? (locale === 'da' ? 'Min konto' : 'My account')
                : (locale === 'da' ? 'Log ind' : 'Sign in')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
