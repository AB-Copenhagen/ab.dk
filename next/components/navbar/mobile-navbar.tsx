'use client';

import { useSession } from '@descope/nextjs-sdk/client';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from 'next-view-transitions';
import { useState } from 'react';
import { IoIosClose, IoIosMenu } from 'react-icons/io';

import { Logo } from '@/components/logo';
import { LocaleSwitcher } from '../locale-switcher';
import { getNavConfig, isDropdown } from './nav-config';

function ChevronRight({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="w-3 h-3 transition-transform duration-200"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
    >
      <path
        d="M4.5 2.5L8.5 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = { logo: any; locale: string };

export function MobileNavbar({ logo, locale }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useSession();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 60));

  const config = getNavConfig(locale);
  const lk = (path: string) => `/${locale}${path}`;
  const close = () => {
    setOpen(false);
    setExpanded(null);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="flex items-center justify-between w-full px-4 transition-colors duration-300"
        style={{
          height: 60,
          background: scrolled ? 'rgba(10,10,9,0.97)' : 'rgba(10,10,9,0.88)',
          borderBottom: scrolled ? '1px solid rgba(0,106,82,0.25)' : '1px solid rgba(0,106,82,0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Logo locale={locale} image={logo?.image} />

        <div className="flex items-center gap-3">
          <LocaleSwitcher currentLocale={locale} />
          <button
            onClick={() => setOpen(true)}
            aria-label={config.openMenu}
            className="p-1 text-white"
          >
            <IoIosMenu className="h-7 w-7" />
          </button>
        </div>
      </div>

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
          style={{ background: 'var(--rich-black)' }}
        >
          {/* Overlay header */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(0,106,82,0.2)' }}
          >
            <Logo locale={locale} image={logo?.image} />
            <button onClick={close} aria-label={config.closeMenu} className="text-white p-1">
              <IoIosClose className="h-8 w-8" />
            </button>
          </div>

          {/* Pre-header links */}
          <div
            className="flex items-center gap-0 px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {config.preHeader.left.map((item, i, arr) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={close}
                className="text-[10px] font-bold uppercase py-1 transition-colors duration-150"
                style={{
                  letterSpacing: '0.14em',
                  color: item.highlight ? 'var(--ab-gold)' : 'rgba(255,255,255,0.4)',
                  paddingRight: i < arr.length - 1 ? 16 : 0,
                  marginRight: i < arr.length - 1 ? 16 : 0,
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : undefined,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Nav items */}
          <nav className="flex flex-col flex-1 px-5 pt-4" aria-label="Mobil navigation">
            {config.primary.map((item) => {
              if (!isDropdown(item)) {
                return (
                  <Link
                    key={item.href}
                    href={lk(item.href)}
                    onClick={close}
                    className="flex items-center py-4 text-[22px] font-black uppercase text-white border-b transition-colors duration-150 hover:text-ab-gold"
                    style={{
                      letterSpacing: '-0.01em',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              }

              const isOpen = expanded === item.label;

              return (
                <div key={item.href} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    className="flex items-center justify-between w-full py-4 text-[22px] font-black uppercase text-white text-left transition-colors duration-150"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    <span style={{ color: isOpen ? 'var(--ab-green)' : undefined }}>
                      {item.label}
                    </span>
                    <ChevronRight open={isOpen} />
                  </button>

                  {isOpen && (
                    <div className="pb-3 pl-2">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={lk(child.href)}
                          onClick={close}
                          className="flex items-center gap-2.5 py-2.5 text-[12px] font-semibold uppercase transition-colors duration-150 hover:text-white"
                          style={{
                            letterSpacing: '0.08em',
                            color: 'rgba(255,255,255,0.45)',
                          }}
                        >
                          <span
                            className="w-1 h-1 rounded-full flex-shrink-0"
                            style={{ background: 'var(--ab-green)' }}
                          />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="px-5 py-6 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,106,82,0.15)' }}>
            <Link
              href={lk(isAuthenticated ? '/konto/profil' : '/konto')}
              onClick={close}
              className="flex items-center justify-center w-full py-3.5 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ab-green)', letterSpacing: '0.14em' }}
            >
              {isAuthenticated ? config.myAccount : config.login}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
