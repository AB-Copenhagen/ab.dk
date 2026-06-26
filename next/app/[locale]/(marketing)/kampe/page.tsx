import { Suspense } from 'react';
import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { FixturesWidget } from '@/components/si/fixtures-widget';
import { StandingsWidget } from '@/components/si/standings-widget';
import type { LocaleParamsProps } from '@/types/types';
import type { Locale } from '@/i18n.config';

export const metadata: Metadata = {
  title: 'Kampe | Akademisk Boldklub',
  description: 'Kampprogram, resultater og stilling for Akademisk Boldklub i 1. division.',
};

function PageHeader({ locale }: { locale: Locale }) {
  return (
    <div className="border-b" style={{ borderColor: '#1A2018' }}>
      <Container>
        <div className="py-14 md:py-20">
          <p
            className="text-xs font-bold uppercase mb-3"
            style={{ color: '#D6A02A', letterSpacing: '0.2em' }}
          >
            {locale === 'da' ? 'Sæson 2024/25' : 'Season 2024/25'}
          </p>
          <h1
            className="text-5xl md:text-6xl font-black text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            {locale === 'da' ? 'Kampe' : 'Fixtures'}
          </h1>
          <div className="mt-5 h-0.5 w-12" style={{ background: '#006A52' }} />
        </div>
      </Container>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[0.6rem] font-bold uppercase mb-5"
      style={{ color: '#7A9185', letterSpacing: '0.18em' }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border" style={{ background: '#0D1410', borderColor: '#1A2018' }}>
      {children}
    </div>
  );
}

function Loader({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-xs" style={{ color: '#7A9185' }}>
      {text}
    </div>
  );
}

export default async function KampePage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const l = locale as Locale;

  return (
    <div className="min-h-screen" style={{ background: '#0A0A09' }}>
      <PageHeader locale={l} />

      <Container>
        <div className="py-10 lg:py-14 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Fixtures column */}
          <section>
            <SectionLabel>
              {l === 'da' ? 'Kampprogram & Resultater' : 'Fixtures & Results'}
            </SectionLabel>
            <Card>
              <Suspense fallback={<Loader text={l === 'da' ? 'Henter kampe…' : 'Loading fixtures…'} />}>
                <FixturesWidget locale={l} limit={20} />
              </Suspense>
            </Card>
          </section>

          {/* Standings column */}
          <section>
            <SectionLabel>
              {l === 'da' ? '1. Division — Stilling' : '1st Division — Table'}
            </SectionLabel>
            <Card>
              <Suspense fallback={<Loader text={l === 'da' ? 'Henter stilling…' : 'Loading table…'} />}>
                <StandingsWidget locale={l} />
              </Suspense>
            </Card>
          </section>
        </div>
      </Container>
    </div>
  );
}
