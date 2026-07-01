import FuzzySearch from 'fuzzy-search';
import { useEffect, useState } from 'react';

import { truncate } from '@/lib/utils';

interface Article {
  slug: string;
  title: string;
  description?: string;
  publishedAt: string;
  categories?: { name: string }[];
}

interface Props {
  articles: Article[];
  locale: 'da' | 'en';
  basePath: string;
}

const T = {
  border: '#152214',
  green: '#006A52',
  gold: '#D6A02A',
  muted: '#8AA898',
  surface: '#0D1A10',
};

export default function ArticleSearch({ articles, locale, basePath }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(articles);

  const searcher = new FuzzySearch(articles, ['title', 'description'], {
    caseSensitive: false,
  });

  useEffect(() => {
    setResults(search ? searcher.search(search) : articles);
  }, [search]);

  function formatDate(str: string) {
    try {
      return new Date(str).toLocaleDateString(
        locale === 'da' ? 'da-DK' : 'en-GB',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );
    } catch {
      return '';
    }
  }

  return (
    <div className="w-full py-10">
      <div
        className="flex sm:flex-row flex-col justify-between gap-4 items-center mb-8 pb-4 border-b"
        style={{ borderColor: T.border }}
      >
        <p
          className="text-lg font-bold text-white"
          style={{ letterSpacing: '-0.01em' }}
        >
          {locale === 'da' ? 'Alle nyheder' : 'All news'}
        </p>
        <div className="relative min-w-full sm:min-w-80">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ color: T.muted }}
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M9.5 9.5L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'da' ? 'Søg i nyheder…' : 'Search news…'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border text-white focus:outline-none transition-colors"
            style={{ borderColor: T.border, color: 'white' }}
            onFocus={(e) => (e.target.style.borderColor = T.green)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: T.border }}>
        {results.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: T.muted }}>
            {locale === 'da' ? 'Ingen resultater fundet' : 'No results found'}
          </p>
        ) : (
          results.map((article, i) => (
            <a
              key={article.slug + i}
              href={`${basePath}${article.slug}`}
              className="flex md:flex-row flex-col items-start justify-between md:items-center group py-5 gap-4"
              style={{ display: 'flex' }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold text-white group-hover:opacity-80 transition-opacity leading-snug"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {article.title}
                </p>
                {article.description && (
                  <p
                    className="text-xs mt-1.5 leading-relaxed"
                    style={{ color: T.muted }}
                  >
                    {truncate(article.description, 100)}
                  </p>
                )}
                <div className="flex gap-2 items-center mt-2 flex-wrap">
                  <span
                    className="text-xs"
                    style={{
                      color: 'rgba(138,168,152,0.5)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatDate(article.publishedAt)}
                  </span>
                  {article.categories?.map((cat, idx) => (
                    <span
                      key={idx}
                      className="text-[0.6rem] font-bold uppercase px-2 py-0.5"
                      style={{
                        color: T.green,
                        background: 'rgba(0,106,82,0.1)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
              <span
                className="text-sm font-bold shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: T.green }}
              >
                →
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
