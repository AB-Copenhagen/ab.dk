'use client';

import { useSession } from '@descope/nextjs-sdk/client';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/logo';
import { LocaleSwitcher } from '../locale-switcher';
import { getNavConfig, isDropdown } from './nav-config';

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 8"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1 1L6 6L11 1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href.length > 1 && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className="flex items-center px-4 h-full text-[11px] font-bold uppercase whitespace-nowrap transition-colors duration-150"
      style={{
        letterSpacing: '0.1em',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        borderBottom: active ? '2px solid var(--ab-green)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = '#fff';
          (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--ab-green)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
          (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent';
        }
      }}
    >
      {children}
    </Link>
  );
}

function NavDropdown({
  label,
  href,
  items,
  locale,
}: {
  label: string;
  href: string;
  items: { label: string; href: string }[];
  locale: string;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith(`/${locale}${href}`);

  return (
    <div className="group relative h-full flex items-stretch">
      <button
        className="flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase whitespace-nowrap transition-colors duration-150"
        style={{
          letterSpacing: '0.1em',
          color: active ? '#fff' : 'rgba(255,255,255,0.6)',
          borderBottom: active ? '2px solid var(--ab-green)' : '2px solid transparent',
        }}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className="w-2.5 h-2.5 opacity-50 transition-transform duration-200 group-hover:rotate-180" />
      </button>

      {/* Dropdown panel */}
      <div
        className="absolute top-full left-0 min-w-[200px] invisible group-hover:visible opacity-0 group-hover:opacity-100 -translate-y-1.5 group-hover:translate-y-0 transition-all duration-150 z-50"
        style={{
          background: '#0C0E0C',
          border: '1px solid rgba(0,106,82,0.25)',
          borderTop: '2px solid var(--ab-green)',
        }}
      >
        {items.map((item) => {
          const full = `/${locale}${item.href}`;
          const itemActive = pathname === full || pathname?.startsWith(full + '/');
          return (
            <Link
              key={item.href}
              href={full}
              className="flex items-center gap-2.5 px-4 py-[10px] text-[10px] font-semibold uppercase border-b border-white/[0.04] last:border-none transition-all duration-100 group/dditem"
              style={{
                letterSpacing: '0.08em',
                color: itemActive ? '#fff' : 'rgba(255,255,255,0.5)',
                background: itemActive ? 'rgba(0,106,82,0.08)' : undefined,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#fff';
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,106,82,0.07)';
                (e.currentTarget as HTMLElement).style.paddingLeft = '20px';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = itemActive ? '#fff' : 'rgba(255,255,255,0.5)';
                (e.currentTarget as HTMLElement).style.background = itemActive ? 'rgba(0,106,82,0.08)' : '';
                (e.currentTarget as HTMLElement).style.paddingLeft = '16px';
              }}
            >
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: 'var(--ab-green)', opacity: itemActive ? 1 : 0.5 }}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { logo: any; locale: string };

export function DesktopNavbar({ logo, locale }: Props) {
  const { isAuthenticated } = useSession();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 80));

  const config = getNavConfig(locale);
  const lk = (path: string) => `/${locale}${path}`;

  return (
    <div>
      {/* ── Pre-header ─────────────────────────────── */}
      <div
        className="w-full flex items-stretch justify-between"
        style={{
          height: 36,
          background: '#060806',
          borderBottom: '1px solid rgba(214,160,42,0.12)',
        }}
      >
        {/* Left: utility links */}
        <div className="flex items-stretch" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {config.preHeader.left.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
              className="flex items-center px-3.5 text-[10px] font-bold uppercase transition-colors duration-150 whitespace-nowrap"
              style={{
                letterSpacing: '0.14em',
                color: item.highlight ? 'var(--ab-gold)' : '#D3BC8D',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                height: '100%',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = item.highlight ? 'var(--ab-gold)' : '#D3BC8D')}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right: locale + social + login */}
        <div className="flex items-stretch">
          {/* Locale switcher */}
          <div
            className="flex items-center px-3"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LocaleSwitcher currentLocale={locale} />
          </div>

          {/* Social icons */}
          <div className="flex items-stretch" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { href: 'https://www.instagram.com/akademisk_boldklub', label: 'Instagram', Icon: InstagramIcon },
              { href: 'https://www.facebook.com/AkademiskBoldklub', label: 'Facebook', Icon: FacebookIcon },
              { href: 'https://www.youtube.com/@AkademiskBoldklub', label: 'YouTube', Icon: YouTubeIcon },
            ].map(({ href, label, Icon }, i, arr) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="w-9 flex items-center justify-center transition-colors duration-150"
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)')}
              >
                <Icon />
              </a>
            ))}
          </div>

          {/* Login / account */}
          <Link
            href={lk(isAuthenticated ? '/konto/profil' : '/konto')}
            className="flex items-center px-5 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity duration-150 hover:opacity-80 whitespace-nowrap"
            style={{ background: 'var(--ab-green)', letterSpacing: '0.14em' }}
          >
            {isAuthenticated ? config.myAccount : config.login}
          </Link>
        </div>
      </div>

      {/* ── Primary nav ────────────────────────────── */}
      <motion.div
        className="w-full flex items-center justify-between px-8"
        style={{ height: 68, borderBottom: '1px solid', backdropFilter: 'blur(16px)' }}
        animate={{
          background: scrolled ? 'rgba(10,10,9,0.97)' : 'rgba(10,10,9,0.92)',
          borderBottomColor: scrolled ? 'rgba(0,106,82,0.25)' : 'rgba(0,106,82,0.1)',
        }}
        transition={{ duration: 0.2 }}
      >
        <Logo locale={locale} image={logo?.image} />

        <nav className="flex items-stretch h-full ml-6" aria-label="Primær navigation">
          {config.primary.map((item) =>
            isDropdown(item) ? (
              <NavDropdown
                key={item.href}
                label={item.label}
                href={item.href}
                items={item.children}
                locale={locale}
              />
            ) : (
              <NavLink key={item.href} href={lk(item.href)}>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </motion.div>
    </div>
  );
}
