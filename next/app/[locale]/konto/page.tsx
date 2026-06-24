import { Descope } from '@descope/nextjs-sdk';
import { session } from '@descope/nextjs-sdk/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import type { LocaleParamsProps } from '@/types/types';

export const metadata: Metadata = {
  title: 'Min konto | AB 1889',
  description: 'Log ind på din AB-konto',
};

export default async function KontoPage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const currentSession = await session();

  // Already authenticated — go straight to the profile
  if (currentSession) {
    redirect(`/${locale}/konto/profil`);
  }

  return (
    <main className="min-h-screen bg-rich-black flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        {/* AB Monogram — swap for licensed SVG from Canva once exported */}
        <div className="flex justify-center mb-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'var(--ab-green)' }}
            aria-label="AB 1889"
          >
            AB
          </div>
        </div>

        <h1
          className="text-center text-2xl font-bold uppercase tracking-widest mb-2"
          style={{ color: 'var(--ab-gold)', letterSpacing: '0.14em' }}
        >
          {locale === 'da' ? 'Min konto' : 'My account'}
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#7A9185' }}>
          Akademisk Boldklub 1889
        </p>

        {/* Descope Flow — themed to AB brand via Descope console */}
        <Descope
          flowId="sign-up-or-in"
          theme="dark"
          locale={locale === 'da' ? 'da-DK' : 'en-US'}
        />
      </div>
    </main>
  );
}
