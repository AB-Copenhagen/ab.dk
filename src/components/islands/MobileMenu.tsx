import { useEffect, useState } from 'react';

import type { NavConfig } from '@/lib/nav-config';

interface Props {
  nav: NavConfig;
  locale: string;
  enPrefix: string;
  toggleId?: string;
}

export default function MobileMenu({
  nav,
  locale,
  enPrefix,
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
    toggle.innerHTML = open
      ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>';
  }, [open, nav.closeMenu, nav.openMenu, toggleId]);

  return (
    <div data-mobile-menu-root="">
      <span className="sr-only">Mobile menu</span>
      {open && (
        <div
          id="mobile-menu-panel"
          className="fixed inset-0 top-[92px] z-40 overflow-y-auto lg:hidden"
          style={{ background: '#006A52', borderTop: '3px solid #D3BC8D' }}
        >
          <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-1">
            {nav.preHeader.left.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                className="text-xs font-bold uppercase py-2 border-b"
                style={{
                  color: item.highlight ? '#D6A02A' : 'rgba(255,255,255,0.4)',
                  borderColor: 'rgba(255,255,255,0.04)',
                  letterSpacing: '0.18em',
                }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}

            <div className="my-3 h-px" style={{ background: '#152214' }} />

            {nav.primary.map((item) => (
              <div key={item.href}>
                {item.children ? (
                  <>
                    <button
                      onClick={() =>
                        setExpanded(expanded === item.href ? null : item.href)
                      }
                      className="w-full flex items-center justify-between py-3 text-sm font-bold text-white uppercase"
                      style={{ letterSpacing: '0.06em' }}
                    >
                      {item.label}
                      <span
                        style={{
                          color: '#006A52',
                          transform:
                            expanded === item.href ? 'rotate(180deg)' : 'none',
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
                            className="py-2 text-xs"
                            style={{
                              color: 'rgba(255,255,255,0.5)',
                              letterSpacing: '0.04em',
                            }}
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
                    className="block py-3 text-sm font-bold text-white uppercase"
                    style={{ letterSpacing: '0.06em' }}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}

            <div className="mt-6">
              <a
                href={locale === 'da' ? '/en' : '/'}
                className="text-xs font-bold uppercase"
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.18em',
                }}
                onClick={() => setOpen(false)}
              >
                {locale === 'da' ? 'Switch to English' : 'Skift til dansk'}
              </a>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
