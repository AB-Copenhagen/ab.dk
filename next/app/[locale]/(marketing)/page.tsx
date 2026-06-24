import { Metadata } from 'next';

import ClientSlugHandler from './ClientSlugHandler';
import PageContent from '@/lib/shared/PageContent';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType } from '@/lib/strapi';
import type { LocaleParamsProps } from '@/types/types';

async function fetchHomepage(locale: string) {
  const results = await fetchCollectionType('pages', {
    filters: { slug: { $eq: 'homepage' }, locale },
  });
  if (results.length > 0) return results[0];
  // Fallback: try default locale so the page still renders
  const fallback = await fetchCollectionType('pages', {
    filters: { slug: { $eq: 'homepage' }, locale: 'en' },
  });
  return fallback[0] ?? null;
}

export async function generateMetadata({
  params,
}: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await fetchHomepage(locale);
  const metadata = generateMetadataObject(pageData?.seo);
  return metadata;
}

export default async function HomePage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const pageData = await fetchHomepage(locale);

  if (!pageData) return null;

  const localizedSlugs = pageData.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = '';
      return acc;
    },
    { [locale]: '' }
  ) ?? { [locale]: '' };

  return (
    <>
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <PageContent pageData={pageData} />
    </>
  );
}
