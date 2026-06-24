'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { i18n } from '@/i18n.config';
import { useSlugContext } from '@/app/context/SlugContext';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const { state } = useSlugContext();
  const { localizedSlugs } = state;

  const pathname = usePathname();
  const segments = pathname.split('/');

  // Always iterate i18n.locales (da/en) — never Strapi's localization keys,
  // which may reflect old seed data (en/fr).
  const generateLocalizedPath = (locale: string): string => {
    if (!pathname) return `/${locale}`;
    // Homepage — just swap the locale prefix
    if (segments.length <= 2) return `/${locale}`;
    // Deep page with a translated slug from Strapi
    if (localizedSlugs[locale]) {
      const swapped = [...segments];
      swapped[1] = locale;
      swapped[swapped.length - 1] = localizedSlugs[locale];
      return swapped.join('/');
    }
    // Fallback — swap locale prefix, keep rest of path unchanged
    const swapped = [...segments];
    swapped[1] = locale;
    return swapped.join('/');
  };

  return (
    <div className="flex gap-1">
      {i18n.locales.map((locale) => (
        <Link
          key={locale}
          href={generateLocalizedPath(locale)}
          className={cn(
            'text-xs font-bold uppercase tracking-widest px-2 py-1 transition-colors duration-150',
            locale === currentLocale
              ? 'text-ab-gold'
              : 'text-white/40 hover:text-white/70'
          )}
          style={{ letterSpacing: '0.12em' }}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
