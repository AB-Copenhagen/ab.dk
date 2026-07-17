#!/usr/bin/env node
/**
 * One-off backfill: populate `originalPublishedAt` on every existing article
 * with its true WordPress publish date, matched by slug.
 *
 * The ~650 articles from the original bulk migration (migrate-wp.mjs) and any
 * articles imported before the `originalPublishedAt` field existed all carry
 * `publishedAt` stamped with their Strapi record-creation time instead of
 * their real WP date (Strapi silently ignores a custom `publishedAt` on
 * create) — this script is the "separate, larger cleanup" that was deferred
 * when catchup-wp.mjs first ran into that behavior.
 *
 * Usage:
 *   STRAPI_TOKEN=<token> node strapi/scripts/backfill-original-published-at.mjs
 *
 * Options (env vars):
 *   STRAPI_URL    default http://127.0.0.1:1337
 *   WP_URL        default https://ab.dk
 *   LOCALE        da|en (default: both, run sequentially)
 *   DRY_RUN=1     print what would change without writing to Strapi
 */

const STRAPI  = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';
const WP_BASE = process.env.WP_URL ?? 'https://ab.dk';
const TOKEN   = process.env.STRAPI_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';
const LOCALES = process.env.LOCALE ? [process.env.LOCALE] : ['da', 'en'];

if (!TOKEN && !DRY_RUN) {
  console.error('Set STRAPI_TOKEN. Get it: Strapi admin → Settings → API Tokens → Create (Full Access)');
  process.exit(1);
}

const authHeader = { Authorization: `Bearer ${TOKEN}` };

async function withRetry(fn, label, attempts = 5, baseDelayMs = 4000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = baseDelayMs * (i + 1);
      console.warn(`  ⚠ ${label} failed (attempt ${i + 1}/${attempts}): ${e.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ── WordPress ──────────────────────────────────────────────────────────────

function wpBaseFor(locale) {
  // Danish is WPML's unprefixed default language (/wp-json/...), English (and
  // any other secondary locale) is served under a /{locale}/ prefix.
  return WP_BASE + (locale === 'da' ? '' : `/${locale}`) + '/wp-json/wp/v2';
}

async function wpGetDateBySlug(locale, slug) {
  const url = new URL(`${wpBaseFor(locale)}/posts`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_fields', 'date');
  const [post] = await withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WP post ${slug} → ${res.status}`);
    return res.json();
  }, `WP post ${slug}`);
  return post?.date ?? null;
}

const OTHER_LOCALE = { da: 'en', en: 'da' };

/**
 * Some articles from the original bulk migration were stamped with the
 * *other* locale's WP slug (e.g. a `da` article carrying its English
 * permalink slug) — confirmed by spot-checking several "unmatched" da
 * entries against the en WP endpoint using their stored slug and finding a
 * real post. Falls back to the sibling locale's WP endpoint with the same
 * slug before giving up.
 */
async function wpGetDateBySlugAnyLocale(locale, slug) {
  const direct = await wpGetDateBySlug(locale, slug);
  if (direct) return direct;
  return wpGetDateBySlug(OTHER_LOCALE[locale], slug);
}

// ── Strapi ─────────────────────────────────────────────────────────────────

/**
 * Page through every article for a locale, small pageSize (see catchup-wp.mjs
 * — full-listing dumps are unreliable against this instance).
 *
 * Sorted by `id:asc` — this MUST be a stable, immutable key. Without an
 * explicit sort, Strapi's default ordering shifted as the run progressed
 * (each write here also bumps the article's own `publishedAt`/`updatedAt`,
 * per Strapi's draft/publish lifecycle), causing offset-based pagination to
 * skip some articles entirely and revisit others — confirmed: several
 * articles were silently never processed and stayed null after a full run.
 */
async function* strapiListArticles(locale, pageSize = 50) {
  let page = 1;
  while (true) {
    const url = new URL(`${STRAPI}/api/articles`);
    url.searchParams.set('locale', locale);
    url.searchParams.set('sort[0]', 'id:asc');
    url.searchParams.set('pagination[page]', String(page));
    url.searchParams.set('pagination[pageSize]', String(pageSize));
    url.searchParams.set('fields[0]', 'slug');
    url.searchParams.set('fields[1]', 'publishedAt');
    url.searchParams.set('fields[2]', 'originalPublishedAt');
    const json = await withRetry(async () => {
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) throw new Error(`Strapi articles page ${page} → ${res.status}`);
      return res.json();
    }, `Strapi articles page ${page} (${locale})`);
    if (!json.data?.length) return;
    yield* json.data;
    if (page >= (json.meta?.pagination?.pageCount ?? 1)) return;
    page++;
  }
}

async function strapiSetOriginalPublishedAt(documentId, locale, originalPublishedAt) {
  if (DRY_RUN) return;
  await withRetry(async () => {
    const res = await fetch(`${STRAPI}/api/articles/${documentId}?locale=${locale}`, {
      method: 'PUT',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { originalPublishedAt } }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`update ${documentId} → ${res.status}: ${JSON.stringify(body)}`);
    return body;
  }, `update ${documentId}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function backfillLocale(locale) {
  console.log(`\n=== Locale: ${locale} ===`);
  let checked = 0, updated = 0, alreadySet = 0, noWpMatch = 0, failed = 0;

  // List EVERY article into memory before writing anything. Each write
  // reassigns that article's internal `id` (Strapi's draft/publish
  // versioning creates a new version, not just a new publishedAt) — so
  // interleaving listing with writing shifts offset-based pagination
  // mid-run and silently skips articles, regardless of sort field. Fully
  // decoupling list-then-write is the only way to guarantee full coverage.
  const articles = [];
  for await (const article of strapiListArticles(locale)) {
    articles.push(article);
  }
  console.log(`  Listed ${articles.length} articles.`);

  for (const article of articles) {
    checked++;
    if (article.originalPublishedAt) {
      alreadySet++;
      continue;
    }
    try {
      let wpDate = await wpGetDateBySlugAnyLocale(locale, article.slug);
      if (!wpDate) {
        // No matching WP post (renamed/deleted post-migration) — fall back to
        // Strapi's own publishedAt rather than leaving the field null, since a
        // null here would sort first in a descending query (Postgres puts
        // NULLs first in DESC by default), wrongly surfacing it as "newest".
        noWpMatch++;
        wpDate = article.publishedAt;
        console.warn(`  ⚠ no WP match, falling back to publishedAt: ${article.slug}`);
      }
      if (DRY_RUN) {
        console.log(`  [DRY] Would set ${article.slug} → ${wpDate}`);
      } else {
        await strapiSetOriginalPublishedAt(article.documentId, locale, wpDate);
      }
      updated++;
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${article.slug}: ${e.message}`);
    }
    if (checked % 25 === 0) {
      process.stdout.write(`  ...${checked} checked (${updated} updated, ${alreadySet} already set, ${noWpMatch} unmatched, ${failed} failed)\n`);
    }
  }

  console.log(`  Done: ${checked} checked, ${updated} updated, ${alreadySet} already set, ${noWpMatch} unmatched, ${failed} failed.`);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== Backfill originalPublishedAt ===');
  console.log(`Strapi: ${STRAPI}  |  WP: ${WP_BASE}  |  Locales: ${LOCALES.join(', ')}`);
  for (const locale of LOCALES) {
    await backfillLocale(locale);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
