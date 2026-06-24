import { Metadata } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { draftMode } from 'next/headers';
import type { PropsWithChildren } from 'react';

import { Banner } from '@/components/banner';
import { DraftModeBanner } from '@/components/draft-mode-banner';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { AIToast } from '@/components/toast';
import { CartProvider } from '@/context/cart-context';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchSingleType, StrapiError } from '@/lib/strapi';
import type { LocaleParamsProps } from '@/types/types';

async function getGlobalData(locale: string) {
  try {
    return await fetchSingleType('global', { locale });
  } catch (e) {
    if (e instanceof StrapiError) return null;
    throw e;
  }
}

// Default Global SEO for pages without them
export async function generateMetadata({
  params,
}: PropsWithChildren<LocaleParamsProps>): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getGlobalData(locale);

  const seo = pageData?.seo;
  const metadata = generateMetadataObject(seo);
  return metadata;
}

export default async function LocaleLayout({
  children,
  params,
}: PropsWithChildren<LocaleParamsProps>) {
  const { isEnabled: isDraftMode } = await draftMode();
  const { locale } = await params;
  const pageData = await getGlobalData(locale);
  const isDemo = process.env.NEXT_IS_DEMO === 'true';

  return (
    <ViewTransitions>
      <CartProvider>
        <div className="bg-rich-black antialiased h-full w-full">
          {isDemo && <Banner />}
          <Navbar data={pageData?.navbar ?? null} locale={locale} hasBanner={isDemo} />
          {children}
          <Footer data={pageData?.footer ?? null} locale={locale} />
          <AIToast />
          {isDraftMode && <DraftModeBanner />}
        </div>
      </CartProvider>
    </ViewTransitions>
  );
}
