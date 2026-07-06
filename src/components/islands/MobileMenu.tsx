import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { NavConfig } from '@/lib/nav-config';

interface Props {
  nav: NavConfig;
  locale: string;
  enPrefix: string;
  switchedLocalePath?: string;
  loginHref?: string;
  toggleId?: string;
}

export default function MobileMenu({
  nav,
  locale,
  enPrefix,
  switchedLocalePath,
  loginHref,
  toggleId = 'mobile-menu-open-btn',
}: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;

    const onClick = () => setOpen((current) => !current);
    toggle.addEventListener('click', onClick);
    return () => toggle.removeEventListener('click', onClick);
  }, [toggleId]);

  useEffect(() => {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;

    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? nav.closeMenu : nav.openMenu);
  }, [open, nav.closeMenu, nav.openMenu, toggleId]);

  return (
    <div data-mobile-menu-root="">
      <span className="sr-only">Mobile menu</span>
      {open &&
        createPortal(
          <div
            id="mobile-menu-panel"
            className="fixed inset-x-0 bottom-0 overflow-y-auto bg-ab-green border-t-[3px] border-ab-beige"
            style={{ top: 'var(--nav-height, 92px)', zIndex: 200 }}
          >
            <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-1">
              {/* ── Utility row: ABTV + Login ── */}
              <div className="flex items-center gap-3 mb-4">
                <a
                  href="https://abtv.ab.dk"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center bg-ab-neon text-ab-green font-black text-sm px-5 py-2 no-underline tracking-[-0.03em]"
                  onClick={() => setOpen(false)}
                >
                  ABTV
                </a>
                {loginHref && (
                  <a
                    href={loginHref}
                    className="flex items-center gap-2 text-white font-medium text-sm no-underline opacity-80"
                    onClick={() => setOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 20 19"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8.57541 10.9615C11.1318 10.9615 13.2165 8.82761 13.2165 6.21156C13.2165 3.59551 11.1315 1.46166 8.57541 1.46166C6.01927 1.46166 3.93429 3.59551 3.93429 6.21156C3.93429 8.82761 6.01927 10.9615 8.57541 10.9615ZM14.2164 10.618C13.4381 10.618 12.7027 10.9322 12.1457 11.4949C11.1889 12.4741 9.92504 13.0076 8.57552 13.0076C7.22601 13.0076 5.95495 12.4669 4.99826 11.4949C4.44846 10.9249 3.71299 10.618 2.92755 10.618C2.14926 10.618 1.41379 10.9249 0.856844 11.4949C0.307047 12.0576 0 12.8103 0 13.6142C0 14.418 0.307047 15.1634 0.856844 15.7334C2.91327 17.8453 5.65517 19 8.56844 19C11.4817 19 14.2236 17.8381 16.28 15.7334C16.8298 15.1707 17.1369 14.418 17.1369 13.6142C17.1369 12.8103 16.8298 12.0649 16.28 11.4949C15.7302 10.9322 14.9948 10.618 14.2093 10.618H14.2164Z" />
                    </svg>
                    {locale === 'da' ? 'Log ind' : 'Sign in'}
                  </a>
                )}
              </div>

              {/* ── Pre-header items (Tickets, Shop, MyAB) ── */}
              {nav.preHeader.left.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                  className={`text-xs font-bold uppercase py-2 border-b tracking-[0.18em] border-white/[0.04] ${item.highlight ? 'text-ab-gold' : 'text-white/40'}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <div className="my-3 h-px bg-[#152214]" />

              {/* ── Primary nav ── */}
              {nav.primary.map((item) => (
                <div key={item.href}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() =>
                          setExpanded(expanded === item.href ? null : item.href)
                        }
                        className="w-full flex items-center justify-between py-3 text-sm font-bold text-white uppercase tracking-[0.06em]"
                      >
                        {item.label}
                        <span
                          className="text-ab-green"
                          style={{
                            transform:
                              expanded === item.href
                                ? 'rotate(180deg)'
                                : 'none',
                            transition: 'transform 0.2s',
                          }}
                        >
                          ▾
                        </span>
                      </button>
                      {expanded === item.href && (
                        <div className="pl-4 mb-2 flex flex-col gap-0.5">
                          {item.children.map((child) => (
                            <a
                              key={child.href}
                              href={enPrefix + child.href}
                              className="py-2 text-xs text-white/50 tracking-[0.04em]"
                              onClick={() => setOpen(false)}
                            >
                              {child.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <a
                      href={enPrefix + item.href}
                      className="block py-3 text-sm font-bold text-white uppercase tracking-[0.06em]"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  )}
                </div>
              ))}

              <div className="mt-4 h-px bg-[#152214]" />

              {/* ── Social icons + lang switch ── */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <a
                    href="https://www.instagram.com/ab1889.dk"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.facebook.com/AB1889"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.youtube.com/@ab1889"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg
                      width="20"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>

                <a
                  href={switchedLocalePath ?? (locale === 'da' ? '/en' : '/')}
                  className="text-xs font-bold uppercase text-white/30 tracking-[0.18em]"
                  onClick={() => setOpen(false)}
                >
                  {locale === 'da' ? 'EN' : 'DA'}
                </a>
              </div>
            </nav>
          </div>,
          document.body
        )}
    </div>
  );
}
