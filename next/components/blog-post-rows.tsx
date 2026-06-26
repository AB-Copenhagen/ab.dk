'use client';

import { format } from 'date-fns';
import FuzzySearch from 'fuzzy-search';
import { Link } from 'next-view-transitions';
import { useEffect, useState } from 'react';

import { truncate } from '@/lib/utils';
import { Article } from '@/types/types';

export const BlogPostRows = ({
  articles,
  locale,
  heading,
  searchPlaceholder,
}: {
  articles: Article[];
  locale: string;
  heading?: string;
  searchPlaceholder?: string;
}) => {
  const [search, setSearch] = useState('');

  const searcher = new FuzzySearch(articles, ['title', 'description'], {
    caseSensitive: false,
  });

  const [results, setResults] = useState(articles);
  useEffect(() => {
    setResults(searcher.search(search));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const defaultHeading = locale === 'da' ? 'Alle nyheder' : 'All articles';
  const defaultPlaceholder = locale === 'da' ? 'Søg i nyheder…' : 'Search articles…';

  return (
    <div className="w-full py-16">
      <div className="flex sm:flex-row flex-col justify-between gap-4 items-center mb-8 pb-4 border-b" style={{ borderColor: '#1A2018' }}>
        <p className="text-lg font-bold text-white tracking-tight">
          {heading ?? defaultHeading}
        </p>
        <div className="relative min-w-full sm:min-w-80">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ color: '#7A9185' }}
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? defaultPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border text-white placeholder-[#7A9185] focus:outline-none focus:border-[#006A52] transition-colors"
            style={{ borderColor: '#1A2018' }}
          />
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: '#1A2018' }}>
        {results.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: '#7A9185' }}>
            {locale === 'da' ? 'Ingen resultater fundet' : 'No results found'}
          </p>
        ) : (
          results.map((article, index) => (
            <BlogPostRow
              article={article}
              key={article.slug + index}
              locale={locale}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const BlogPostRow = ({
  article,
  locale,
}: {
  article: Article;
  locale: string;
}) => {
  return (
    <Link
      href={`/${locale}/blog/${article.slug}`}
      key={`${article.slug}`}
      className="flex md:flex-row flex-col items-start justify-between md:items-center group py-4"
    >
      <div>
        <p className="text-neutral-300 text-lg font-medium group-hover:text-white transition duration-200">
          {article.title}
        </p>
        <p className="text-neutral-300 text-sm mt-2 max-w-xl group-hover:text-white transition duration-200">
          {truncate(article.description, 80)}
        </p>

        <div className="flex gap-2 items-center my-4">
          <p className="text-neutral-300 text-sm  max-w-xl group-hover:text-white transition duration-200">
            {format(new Date(article.publishedAt), 'MMMM dd, yyyy')}
          </p>
          <div className="h-1 w-1 rounded-full bg-neutral-800"></div>
          <div className="flex gap-4 flex-wrap ">
            {article.categories?.map((category, idx) => (
              <p
                key={`category-${idx}`}
                className="text-xs font-bold text-muted px-2 py-1 rounded-full bg-neutral-800 capitalize"
              >
                {category.name}
              </p>
            ))}
          </div>
        </div>
      </div>
      {/* <Image
        src={blog.authorAvatar}
        alt={blog.author}
        width={40}
        height={40}
        className="rounded-full md:h-10 md:w-10 h-6 w-6 mt-4 md:mt-0 object-cover"
      /> */}
    </Link>
  );
};
