import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';

import ClientSlugHandler from './ClientSlugHandler';
import { BlurImage } from '@/components/blur-image';
import { StandingsWidget } from '@/components/si/standings-widget';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType } from '@/lib/strapi';
import { resolveStrapiMedia } from '@/lib/strapi/strapiImage';
import { fetchABEvents } from '@/lib/si/client';
import { truncate } from '@/lib/utils';
import type { Article, LocaleParamsProps } from '@/types/types';
import type { Locale } from '@/i18n.config';
import type { SIEvent } from '@/lib/si/client';

async function fetchHomepage(locale: string) {
  const results = await fetchCollectionType('pages', {
    filters: { slug: { $eq: 'homepage' }, locale },
  }).catch(() => []);
  if ((results as any[]).length > 0) return (results as any[])[0];
  const fallback = await fetchCollectionType('pages', {
    filters: { slug: { $eq: 'homepage' }, locale: 'en' },
  }).catch(() => []);
  return (fallback as any[])[0] ?? null;
}

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await fetchHomepage(locale);
  return generateMetadataObject(pageData?.seo) ?? {
    title: 'Akademisk Boldklub — AB 1889',
  };
}

// ── Shared tokens ────────────────────────────────────────────
const T = {
  ground:  '#060806',
  surface: '#0D1A10',
  border:  '#152214',
  green:   '#006A52',
  gold:    '#C9941F',
  muted:   '#8AA898',
};

// ── Sub-components ───────────────────────────────────────────

function ArticleImageFallback() {
  return (
    <div
      className="h-full w-full flex items-center justify-center font-black"
      style={{
        background: `linear-gradient(135deg, ${T.surface} 0%, #091208 100%)`,
        fontSize: '3rem',
        color: 'rgba(0,106,82,0.18)',
        letterSpacing: '-0.04em',
      }}
    >
      AB
    </div>
  );
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <p className="text-xs font-bold uppercase mb-2" style={{ color: T.green, letterSpacing: '0.18em' }}>
      {name}
    </p>
  );
}

function ArticleDate({ dateStr }: { dateStr: string }) {
  try {
    return (
      <p className="text-xs mt-auto pt-3" style={{ color: 'rgba(138,168,152,0.5)', fontVariantNumeric: 'tabular-nums' }}>
        {format(new Date(dateStr), 'd. MMM yyyy')}
      </p>
    );
  } catch {
    return null;
  }
}

function FeaturedArticle({ article, locale }: { article: Article; locale: Locale }) {
  return (
    <Link
      href={`/${locale}/blog/${article.slug}`}
      className="group grid md:grid-cols-2 border mb-px"
      style={{ borderColor: T.border }}
    >
      <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
        {article.image?.url ? (
          <BlurImage
            {...resolveStrapiMedia(article.image.url)}
            alt={article.title}
            width={800}
            height={600}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            style={{ minHeight: 260 }}
          />
        ) : (
          <div style={{ minHeight: 260 }}>
            <ArticleImageFallback />
          </div>
        )}
      </div>
      <div className="p-6 md:p-8 flex flex-col" style={{ background: T.surface }}>
        {article.categories?.[0] && <CategoryBadge name={article.categories[0].name} />}
        <h2
          className="font-bold text-white leading-tight mb-3"
          style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.55rem)', letterSpacing: '-0.02em' }}
        >
          {article.title}
        </h2>
        {article.description && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: T.muted }}>
            {truncate(article.description, 160)}
          </p>
        )}
        <ArticleDate dateStr={article.publishedAt} />
      </div>
    </Link>
  );
}

function ArticleCard({ article, locale }: { article: Article; locale: Locale }) {
  return (
    <Link
      href={`/${locale}/blog/${article.slug}`}
      className="group flex flex-col"
      style={{ background: T.surface }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {article.image?.url ? (
          <BlurImage
            {...resolveStrapiMedia(article.image.url)}
            alt={article.title}
            width={600}
            height={338}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ArticleImageFallback />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        {article.categories?.[0] && <CategoryBadge name={article.categories[0].name} />}
        <h3
          className="text-sm font-bold text-white leading-snug"
          style={{ letterSpacing: '-0.01em' }}
        >
          {article.title}
        </h3>
        <ArticleDate dateStr={article.publishedAt} />
      </div>
    </Link>
  );
}

function RecentResults({ events, locale }: { events: SIEvent[]; locale: Locale }) {
  if (!events.length) return null;
  return (
    <div className="border" style={{ borderColor: T.border, background: T.surface }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b text-xs font-bold uppercase"
        style={{ borderColor: T.border, color: T.muted, letterSpacing: '0.18em' }}
      >
        <span>{locale === 'da' ? 'Seneste resultater' : 'Recent results'}</span>
        <Link href={`/${locale}/kampe`} className="text-xs" style={{ color: T.green, letterSpacing: '0.08em' }}>
          {locale === 'da' ? 'Se alle →' : 'All →'}
        </Link>
      </div>
      <ul>
        {events.map((event) => {
          const abHome = event.homeId === 9805;
          const opp = abHome ? event.awayName : event.homeName;
          return (
            <li
              key={event.eventId}
              className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 gap-3"
              style={{ borderColor: 'rgba(21,34,20,0.5)' }}
            >
              <span className="text-xs font-semibold text-white truncate">
                {abHome ? `AB — ${opp}` : `${opp} — AB`}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {event.score && (
                  <span
                    className="text-sm font-black"
                    style={{ color: T.gold, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {event.score}
                  </span>
                )}
                <span
                  className="text-[0.6rem] font-bold uppercase"
                  style={{ color: 'rgba(138,168,152,0.4)', letterSpacing: '0.1em' }}
                >
                  FT
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function HomePage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const l = locale as Locale;

  const [articles, events] = await Promise.all([
    fetchCollectionType<Article[]>('articles', {
      filters: { locale: { $eq: locale } },
      sort: ['publishedAt:desc'],
      pagination: { pageSize: 7 },
    }).catch(() => [] as Article[]),
    fetchABEvents({ locale: l, limit: 15 }).catch(() => [] as SIEvent[]),
  ]);

  const [featured, ...rest] = articles;
  const gridArticles = rest.slice(0, 6);

  const nextMatch = events.find(
    (e) => e.statusType === 'notstarted' || e.statusType === 'inprogress'
  );
  const recentResults = events.filter((e) => e.statusType === 'finished').slice(0, 3);

  const abHome = nextMatch ? nextMatch.homeId === 9805 : false;
  const opponent = nextMatch ? (abHome ? nextMatch.awayName : nextMatch.homeName) : null;
  const matchDate = nextMatch
    ? new Date(nextMatch.startDate).toLocaleDateString(l === 'da' ? 'da-DK' : 'en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      }).toUpperCase()
    : null;
  const matchTime = nextMatch
    ? new Date(nextMatch.startDate).toLocaleTimeString(l === 'da' ? 'da-DK' : 'en-GB', {
        hour: '2-digit', minute: '2-digit',
      })
    : null;
  const venue = nextMatch?.properties?.venue ?? null;

  const localizedSlugs: Record<string, string> = { da: '', en: '' };

  return (
    <>
      <style>{`
        .ab-hero {
          background:
            radial-gradient(ellipse 90% 55% at 50% -10%, rgba(0,106,82,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 50% 35% at 15% 110%, rgba(0,106,82,0.10) 0%, transparent 55%),
            ${T.ground};
        }
        .ab-hero-lines::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(0deg,   rgba(0,106,82,0.025) 0, rgba(0,106,82,0.025) 1px, transparent 1px, transparent 72px),
            repeating-linear-gradient(90deg,  rgba(0,106,82,0.015) 0, rgba(0,106,82,0.015) 1px, transparent 1px, transparent 120px);
          pointer-events: none;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ab-fade-up { animation: ab-rise 0.8s cubic-bezier(0.16,1,0.3,1) both; }
          .ab-fade-up-delay { animation: ab-rise 0.8s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
          @keyframes ab-rise {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>

      <ClientSlugHandler localizedSlugs={localizedSlugs} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="ab-hero ab-hero-lines relative min-h-[calc(100svh-104px)] flex flex-col justify-end overflow-hidden px-5 md:px-12 pb-14 md:pb-20"
      >
        {/* Ghost monogram */}
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute bottom-[-8vw] right-[-3vw] font-black leading-none"
          style={{
            fontSize: '58vw',
            color: 'rgba(0,106,82,0.055)',
            letterSpacing: '-0.06em',
          }}
        >
          AB
        </span>

        {/* Bottom vignette */}
        <div
          className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${T.ground}, transparent)` }}
        />

        <div className="ab-fade-up relative z-10 max-w-5xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-7">
            <div className="h-px w-8" style={{ background: T.gold }} />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: T.gold, letterSpacing: '0.22em' }}
            >
              Akademisk Boldklub &middot; Siden 1889
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black text-white uppercase"
            style={{
              fontSize: 'clamp(5rem, 15vw, 13rem)',
              letterSpacing: '-0.04em',
              lineHeight: 0.88,
              textWrap: 'balance',
            }}
          >
            {l === 'da' ? <>Vær<br />med.</> : <>Be<br />part.</>}
          </h1>

          <div className="mt-6 mb-6 h-0.5 w-12" style={{ background: T.green }} />

          <p
            className="text-sm mb-8 max-w-[36ch] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.01em' }}
          >
            {l === 'da'
              ? 'Bliv en del af historien. Følg holdet, køb billetter og støt din klub hjemme og ude.'
              : 'Be part of the story. Follow the squad, buy tickets and support your club home and away.'}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="https://billetter.ab.dk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-bold text-white uppercase text-xs px-6 py-3 transition-all duration-200"
              style={{ background: T.green, letterSpacing: '0.15em' }}
            >
              {l === 'da' ? 'Køb billetter' : 'Buy tickets'} →
            </Link>
            <Link
              href={`/${l}/nyheder`}
              className="inline-flex items-center gap-2 font-bold uppercase text-xs px-6 py-3 border transition-all duration-200 hover:border-white/50 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.15em' }}
            >
              {l === 'da' ? 'Se nyheder' : 'Read news'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Next match bar ───────────────────────────────── */}
      {nextMatch && opponent && (
        <div
          className="ab-fade-up-delay border-y"
          style={{ background: T.green, borderColor: 'rgba(0,0,0,0.25)' }}
        >
          <div className="max-w-7xl mx-auto px-5 md:px-12 h-14 flex items-center justify-between gap-4">
            <span
              className="text-xs font-bold uppercase hidden sm:block shrink-0"
              style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em' }}
            >
              {l === 'da' ? 'Næste kamp' : 'Next fixture'}
            </span>

            <div
              className="flex items-center gap-3 font-black text-white uppercase text-sm"
              style={{ letterSpacing: '-0.01em' }}
            >
              <span>AB</span>
              <span className="text-xs font-bold opacity-40" style={{ letterSpacing: '0.1em' }}>vs</span>
              <span>{opponent}</span>
            </div>

            <div
              className="hidden md:flex items-center gap-2 text-xs shrink-0"
              style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}
            >
              {matchDate && <span>{matchDate}</span>}
              <span style={{ opacity: 0.35 }}>·</span>
              {matchTime && (
                <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {matchTime}
                </span>
              )}
              {venue && (
                <>
                  <span style={{ opacity: 0.35 }}>·</span>
                  <span>{venue}</span>
                </>
              )}
            </div>

            <Link
              href="https://billetter.ab.dk"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-bold uppercase px-3 py-1.5 border transition-colors duration-200 hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.12em' }}
            >
              {l === 'da' ? 'Billetter →' : 'Tickets →'}
            </Link>
          </div>
        </div>
      )}

      {/* ── News + Sidebar ───────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-5 md:px-12 py-12 lg:py-16 grid lg:grid-cols-[1fr_296px] gap-8 items-start"
        style={{ background: T.ground }}
      >
        {/* News column */}
        <div>
          <div
            className="flex items-center gap-3 mb-5 text-xs font-bold uppercase"
            style={{ color: T.muted, letterSpacing: '0.22em' }}
          >
            <span>{l === 'da' ? 'Seneste fra klubben' : 'Latest from the club'}</span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          {featured && <FeaturedArticle article={featured} locale={l} />}

          {gridArticles.length > 0 && (
            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px"
              style={{ background: T.border }}
            >
              {gridArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} locale={l} />
              ))}
            </div>
          )}

          {!featured && !gridArticles.length && (
            <p className="py-16 text-sm text-center" style={{ color: T.muted }}>
              {l === 'da' ? 'Ingen artikler endnu.' : 'No articles yet.'}
            </p>
          )}

          <Link
            href={`/${l}/nyheder`}
            className="inline-flex items-center gap-1 mt-5 text-xs font-bold uppercase transition-opacity duration-200 hover:opacity-70"
            style={{ color: T.green, letterSpacing: '0.12em' }}
          >
            {l === 'da' ? 'Se alle nyheder' : 'All news'} →
          </Link>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          {/* Standings */}
          <div className="border" style={{ borderColor: T.border, background: T.surface }}>
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b text-xs font-bold uppercase"
              style={{ borderColor: T.border, color: T.muted, letterSpacing: '0.18em' }}
            >
              <span>{l === 'da' ? '1. Division' : '1st Division'}</span>
              <Link
                href={`/${l}/kampe`}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: T.green, letterSpacing: '0.08em' }}
              >
                {l === 'da' ? 'Se tabel →' : 'Full table →'}
              </Link>
            </div>
            <Suspense
              fallback={
                <div className="py-6 text-center text-xs" style={{ color: T.muted }}>
                  {l === 'da' ? 'Henter stilling…' : 'Loading table…'}
                </div>
              }
            >
              <StandingsWidget locale={l} />
            </Suspense>
          </div>

          <RecentResults events={recentResults} locale={l} />

          {/* Squad link */}
          <Link
            href={`/${l}/hold`}
            className="group border flex items-center justify-between px-4 py-4 transition-colors duration-200 hover:border-[#006A52]"
            style={{ borderColor: T.border, background: T.surface }}
          >
            <div>
              <p
                className="text-xs font-bold uppercase mb-1"
                style={{ color: T.muted, letterSpacing: '0.18em' }}
              >
                {l === 'da' ? 'Holdet' : 'The Squad'}
              </p>
              <p className="text-sm font-bold text-white" style={{ letterSpacing: '-0.01em' }}>
                {l === 'da' ? 'Se spillertruppen' : 'View the squad'}
              </p>
            </div>
            <span className="text-lg font-bold transition-transform duration-200 group-hover:translate-x-1" style={{ color: T.green }}>
              →
            </span>
          </Link>
        </aside>
      </div>

      {/* ── Join MyAB strip ──────────────────────────────── */}
      <div
        className="border-t"
        style={{ borderColor: T.border, background: T.surface }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-12 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p
              className="text-xs font-bold uppercase mb-2"
              style={{ color: T.gold, letterSpacing: '0.2em' }}
            >
              MyAB Membership
            </p>
            <h2
              className="font-black text-white mb-3"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}
            >
              {l === 'da' ? <>Bliv en del<br />af klubben.</> : <>Be part of<br />the club.</>}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
              {l === 'da'
                ? 'Eksklusiv adgang til sæsonkort, merchandise-rabatter, fan-events og alt der sker bag kulisserne.'
                : 'Exclusive access to season tickets, merchandise discounts, fan events and everything happening behind the scenes.'}
            </p>
          </div>
          <Link
            href={`/${l}/bliv-involveret`}
            className="shrink-0 inline-flex items-center gap-2 font-bold text-white uppercase text-xs px-7 py-4 transition-opacity duration-200 hover:opacity-80"
            style={{ background: T.green, letterSpacing: '0.15em' }}
          >
            {l === 'da' ? 'Tilmeld MyAB' : 'Join MyAB'} →
          </Link>
        </div>
      </div>
    </>
  );
}
