import type { Metadata } from 'next';

import ClientSlugHandler from '../ClientSlugHandler';
import { BlogCard } from '@/components/blog-card';
import { BlogPostRows } from '@/components/blog-post-rows';
import { Container } from '@/components/container';
import { fetchCollectionType } from '@/lib/strapi';
import type { Article, LocaleParamsProps } from '@/types/types';

export const metadata: Metadata = {
  title: 'Nyheder | Akademisk Boldklub',
  description: 'Seneste nyheder og historier fra Akademisk Boldklub.',
};

export default async function NyhederPage({ params }: LocaleParamsProps) {
  const { locale } = await params;

  const allArticles = await fetchCollectionType<Article[]>('articles', {
    filters: { locale: { $eq: locale } },
  });

  const [featured, ...rest] = allArticles ?? [];

  // Tell the locale switcher which path this page lives at in each locale
  const localizedSlugs: Record<string, string> = { da: 'nyheder', en: 'nyheder' };

  return (
    <div className="min-h-screen" style={{ background: '#0A0A09' }}>
      <ClientSlugHandler localizedSlugs={localizedSlugs} />

      {/* Page header */}
      <div className="border-b" style={{ borderColor: '#1A2018' }}>
        <Container>
          <div className="py-14 md:py-20">
            <p
              className="text-xs font-bold uppercase mb-3"
              style={{ color: '#D6A02A', letterSpacing: '0.2em' }}
            >
              Akademisk Boldklub
            </p>
            <h1
              className="text-5xl md:text-6xl font-black text-white"
              style={{ letterSpacing: '-0.02em' }}
            >
              {locale === 'da' ? 'Nyheder' : 'News'}
            </h1>
            <div className="mt-5 h-0.5 w-12" style={{ background: '#006A52' }} />
          </div>
        </Container>
      </div>

      <Container className="pb-20">
        {/* Featured article */}
        {featured && (
          <div className="pt-12 pb-4">
            <BlogCard article={featured} locale={locale} />
          </div>
        )}

        {/* Searchable article list */}
        {rest.length > 0 && (
          <BlogPostRows
            articles={rest}
            locale={locale}
            heading={locale === 'da' ? 'Alle nyheder' : 'All news'}
            searchPlaceholder={locale === 'da' ? 'Søg i nyheder…' : 'Search news…'}
          />
        )}

        {!featured && (
          <p className="text-center py-24 text-sm" style={{ color: '#7A9185' }}>
            {locale === 'da' ? 'Ingen nyheder endnu.' : 'No news yet.'}
          </p>
        )}
      </Container>
    </div>
  );
}
