import { UserProfile } from '@descope/nextjs-sdk';
import { session } from '@descope/nextjs-sdk/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import type { LocaleParamsProps } from '@/types/types';

export const metadata: Metadata = {
  title: 'Min profil | AB 1889',
  description: 'Administrer din AB-konto',
};

export default async function ProfilPage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const currentSession = await session();

  if (!currentSession) {
    redirect(`/${locale}/konto`);
  }

  // User fields live as JWT claims on token — typed via index signature
  const token = currentSession.token;
  const name    = token.name    as string | undefined;
  const email   = token.email   as string | undefined;
  const picture = token.picture as string | undefined;

  return (
    <main className="min-h-screen bg-rich-black px-4 py-24">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          {picture ? (
            <img
              src={picture}
              alt={name ?? 'Profil'}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--ab-green)' }}
            >
              {name?.charAt(0)?.toUpperCase() ?? email?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--ab-gold)', letterSpacing: '0.14em' }}
            >
              Akademisk Boldklub
            </p>
            <h1 className="text-xl font-bold text-white">{name ?? email}</h1>
          </div>
        </div>

        {/* Descope User Profile Widget — handles password, MFA, social accounts */}
        <div className="border border-[#1A2018] overflow-hidden">
          <div
            className="px-5 py-3 border-b border-[#1A2018] text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--ab-gold)', letterSpacing: '0.14em' }}
          >
            {locale === 'da' ? 'Kontoadministration' : 'Account management'}
          </div>
          <div className="p-2 bg-[#0D1410]">
            <UserProfile
              widgetId="user-profile-widget"
              locale={locale === 'da' ? 'da-DK' : 'en-US'}
            />
          </div>
        </div>

      </div>
    </main>
  );
}
