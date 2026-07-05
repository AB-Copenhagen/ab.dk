import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  }, [open, nav.closeMenu, nav.openMenu, toggleId]);

  return (
    <div data-mobile-menu-root="">
      <span className="sr-only">Mobile menu</span>
      {open && createPortal(
        <div
          id="mobile-menu-panel"
          className="fixed inset-x-0 bottom-0 overflow-y-auto bg-ab-green border-t-[3px] border-ab-beige"
          style={{ top: 'var(--nav-height, 92px)', zIndex: 200 }}
        >
          <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-1">
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

            <div className="mt-6">
              <a
                href={locale === 'da' ? '/en' : '/'}
                className="text-xs font-bold uppercase text-white/30 tracking-[0.18em]"
                onClick={() => setOpen(false)}
              >
                {locale === 'da' ? 'Switch to English' : 'Skift til dansk'}
              </a>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </div>
  );
}
