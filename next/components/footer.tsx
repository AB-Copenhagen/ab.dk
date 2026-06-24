import { Link } from 'next-view-transitions';

import { Logo } from '@/components/logo';

export const Footer = async ({ data, locale }: { data: any; locale: string }) => {
  return (
    <footer
      className="relative border-t"
      style={{ borderColor: 'rgba(0,106,82,0.25)', background: '#080A08' }}
    >
      {/* AB Green top accent */}
      <div className="h-px w-full" style={{ background: 'var(--ab-green)' }} />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Logo image={data?.logo?.image} locale={locale} />
            <p
              className="mt-5 text-xs leading-relaxed max-w-xs"
              style={{ color: 'rgba(255,255,255,0.4)', lineHeight: '1.8' }}
            >
              {data?.description ?? 'Akademisk Boldklub er en dansk fodboldklub grundlagt i 1889. Vi spiller i 1. division og har hjemmebane på Gladsaxe Stadion.'}
            </p>
          </div>

          {/* Link columns */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <LinkSection title={locale === 'da' ? 'Klub' : 'Club'} links={data?.internal_links} locale={locale} />
            <LinkSection title={locale === 'da' ? 'Information' : 'Information'} links={data?.policy_links} locale={locale} />
            <LinkSection title={locale === 'da' ? 'Følg os' : 'Follow us'} links={data?.social_media_links} locale={locale} />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {data?.copyright ?? `© ${new Date().getFullYear()} Akademisk Boldklub. Alle rettigheder forbeholdes.`}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em' }}>
            AB · EST. 1889
          </p>
        </div>
      </div>
    </footer>
  );
};

const LinkSection = ({
  title,
  links,
  locale,
}: {
  title: string;
  links?: { text: string; URL: string }[];
  locale: string;
}) => (
  <div>
    <p
      className="text-xs font-bold uppercase tracking-widest mb-5"
      style={{ color: 'var(--ab-gold)', letterSpacing: '0.14em' }}
    >
      {title}
    </p>
    <div className="flex flex-col gap-3">
      {links?.map((link) => (
        <Link
          key={link.text}
          href={`${link.URL.startsWith('http') ? '' : `/${locale}`}${link.URL}`}
          className="text-xs transition-colors hover:text-white"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {link.text}
        </Link>
      ))}
    </div>
  </div>
);
