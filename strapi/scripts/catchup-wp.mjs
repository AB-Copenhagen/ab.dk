#!/usr/bin/env node
/**
 * Catch up Strapi articles with any WordPress posts published since the
 * original bulk migration (migrate-wp.mjs) ran. Diffs WP post slugs against
 * existing Strapi article slugs for a locale and imports only what's missing.
 *
 * Usage:
 *   STRAPI_TOKEN=<token> STRAPI_URL=<url> node strapi/scripts/catchup-wp.mjs
 *
 * Options (env vars):
 *   STRAPI_URL    default http://127.0.0.1:1337
 *   WP_URL        default https://ab.dk
 *   LOCALE        da|en (default: en)
 *   DRY_RUN=1     print what would be imported without writing to Strapi
 */

const LOCALE  = process.env.LOCALE ?? 'en';
// Danish is WPML's unprefixed default language on ab.dk (/wp-json/...), while
// English (and any other secondary locale) is served under a /{locale}/ prefix.
const WP      = (process.env.WP_URL ?? 'https://ab.dk') + (LOCALE === 'da' ? '' : `/${LOCALE}`) + '/wp-json/wp/v2';
const STRAPI  = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';
const TOKEN   = process.env.STRAPI_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!TOKEN && !DRY_RUN) {
  console.error('Set STRAPI_TOKEN. Get it: Strapi admin → Settings → API Tokens → Create (Full Access)');
  process.exit(1);
}

const authHeader = { Authorization: `Bearer ${TOKEN}` };

// Known-bad WP posts to skip on import (garbled title/content on the WP side
// itself, unrelated to this script — re-check on the WP side before retrying).
const EXCLUDE_SLUGS = new Set([
  '%f0%9f%93%b8-from-the-first-days-of-training', // title stored as literal "????" — emoji corrupted in WP's DB
]);

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

// ── WordPress helpers ─────────────────────────────────────────────────────────

async function wpGetAllSlugs() {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${WP}/posts`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'publish');
    url.searchParams.set('_fields', 'id,slug,date');
    const res = await withRetry(() => fetch(url), `WP posts page ${page}`);
    if (!res.ok) break;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') ?? '1');
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

async function wpGetPostBySlug(slug) {
  const url = new URL(`${WP}/posts`);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_fields', 'id,title,slug,date,excerpt,content,categories,featured_media');
  const [post] = await withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WP post ${slug} → ${res.status}`);
    return res.json();
  }, `WP post ${slug}`);
  return post;
}

async function wpGetCategoryName(id) {
  return withRetry(async () => {
    const res = await fetch(`${WP}/categories/${id}?_fields=id,name`);
    if (!res.ok) throw new Error(`WP category ${id} → ${res.status}`);
    const cat = await res.json();
    return cat?.name ?? null;
  }, `WP category ${id}`);
}

async function wpGetMediaUrl(id) {
  return withRetry(async () => {
    const res = await fetch(`${WP}/media/${id}?_fields=source_url`);
    if (!res.ok) throw new Error(`WP media ${id} → ${res.status}`);
    const media = await res.json();
    return media?.source_url ?? null;
  }, `WP media ${id}`);
}

// ── Strapi helpers ────────────────────────────────────────────────────────────

/**
 * A generic `pagination[pageSize]=100` listing dump proved unreliable against
 * the hosted Strapi instance (persistent 503s, likely due to relation
 * population cost across ~650 rows). Checking existence via small
 * `filters[slug][$in]` batches is far lighter and has proven reliable, so we
 * diff by asking "which of these candidate slugs already exist?" in chunks.
 */
async function strapiFindExistingSlugs(candidateSlugs, locale, chunkSize = 25) {
  const existing = new Set();
  for (let i = 0; i < candidateSlugs.length; i += chunkSize) {
    const chunk = candidateSlugs.slice(i, i + chunkSize);
    const url = new URL(`${STRAPI}/api/articles`);
    url.searchParams.set('locale', locale);
    url.searchParams.set('pagination[pageSize]', String(chunkSize));
    url.searchParams.set('fields[0]', 'slug');
    chunk.forEach((slug, idx) => url.searchParams.set(`filters[slug][$in][${idx}]`, slug));
    const json = await withRetry(async () => {
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) throw new Error(`Strapi slug check chunk ${i / chunkSize + 1} → ${res.status}`);
      return res.json();
    }, `Strapi slug check chunk ${i / chunkSize + 1}`);
    json.data.forEach(a => existing.add(a.slug));
    process.stdout.write(`\r  Checked ${Math.min(i + chunkSize, candidateSlugs.length)}/${candidateSlugs.length} candidate slugs...`);
  }
  console.log('');
  return existing;
}

async function strapiGetCategories(locale) {
  const json = await withRetry(async () => {
    const res = await fetch(`${STRAPI}/api/categories?locale=${locale}&pagination[pageSize]=100&fields[0]=name`, { headers: authHeader });
    if (!res.ok) throw new Error(`Strapi categories → ${res.status}`);
    return res.json();
  }, 'Strapi categories');
  return new Map(json.data.map(c => [c.name, c.documentId]));
}

async function strapiCreateCategory(name, locale) {
  if (DRY_RUN) { console.log(`  [DRY] Would create category "${name}"`); return `dry-cat-${name}`; }
  const json = await withRetry(async () => {
    const res = await fetch(`${STRAPI}/api/categories?locale=${locale}`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { name, locale } }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`create category ${name} → ${res.status}: ${JSON.stringify(body)}`);
    return body;
  }, `create category ${name}`);
  return json.data.documentId;
}

async function strapiUploadImage(remoteUrl, filename) {
  if (DRY_RUN) return null;
  const buffer = await withRetry(async () => {
    const imgRes = await fetch(remoteUrl);
    if (!imgRes.ok) throw new Error(`download image ${filename} → ${imgRes.status}`);
    return { buf: await imgRes.arrayBuffer(), contentType: imgRes.headers.get('content-type') ?? 'image/jpeg' };
  }, `download image ${filename}`);

  const form = new FormData();
  form.append('files', new Blob([buffer.buf], { type: buffer.contentType }), filename);
  const files = await withRetry(async () => {
    const uploadRes = await fetch(`${STRAPI}/api/upload`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    if (!uploadRes.ok) throw new Error(`upload image ${filename} → ${uploadRes.status}`);
    return uploadRes.json();
  }, `upload image ${filename}`);
  return files?.[0]?.id ?? null;
}

const OTHER_LOCALE = LOCALE === 'da' ? 'en' : 'da';

/**
 * Looks for an existing article in the other locale with the same
 * originalPublishedAt timestamp, so the new article can be created as a proper
 * Strapi locale variant of it instead of an independent, unrelated document
 * (the bug behind ~500 DA/EN articles never showing up as translations of each
 * other in Strapi's admin). Only links on an unambiguous single match — a
 * handful of WP posts share a timestamp with an unrelated post in the other
 * locale, and guessing wrong there is worse than not linking at all.
 */
async function strapiFindLinkableDocument(originalPublishedAt) {
  if (!TOKEN) return null;
  const url = new URL(`${STRAPI}/api/articles`);
  url.searchParams.set('locale', OTHER_LOCALE);
  url.searchParams.set('filters[originalPublishedAt][$eq]', originalPublishedAt);
  url.searchParams.set('fields[0]', 'documentId');
  url.searchParams.set('pagination[pageSize]', '2');
  const json = await withRetry(async () => {
    const res = await fetch(url, { headers: authHeader });
    if (!res.ok) throw new Error(`Strapi linkable-document check → ${res.status}`);
    return res.json();
  }, 'Strapi linkable-document check');
  return json.data.length === 1 ? json.data[0].documentId : null;
}

async function strapiCreateOrLinkArticle(body) {
  const linkedDocumentId = await strapiFindLinkableDocument(body.data.originalPublishedAt).catch(() => null);

  if (DRY_RUN) {
    const action = linkedDocumentId
      ? `Would link to existing ${OTHER_LOCALE} document ${linkedDocumentId}`
      : 'Would create article';
    console.log(`  [DRY] ${action}`, JSON.stringify(body.data).slice(0, 150));
    return { documentId: 'dry-run-id' };
  }

  const method = linkedDocumentId ? 'PUT' : 'POST';
  const url = linkedDocumentId
    ? `${STRAPI}/api/articles/${linkedDocumentId}?locale=${LOCALE}`
    : `${STRAPI}/api/articles?locale=${LOCALE}`;
  if (linkedDocumentId) {
    console.log(`  ↳ linking to existing ${OTHER_LOCALE} document ${linkedDocumentId}`);
  }

  const json = await withRetry(async () => {
    const res = await fetch(url, {
      method,
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseBody = await res.json();
    if (!res.ok) throw new Error(`${method} article → ${res.status}: ${JSON.stringify(responseBody)}`);
    return responseBody;
  }, `${method} article`);
  return json.data;
}

// ── HTML helpers (same conversion as migrate-wp.mjs) ──────────────────────────

// Named entities beyond the numeric ones handled generically below. WP content
// commonly carries curly quotes, dashes, and an ellipsis as numeric entities
// (&#8211; etc.) — those are decoded by the numeric passes, not this table.
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
    .replace(/ /g, ' ');
}

function htmlToBlocks(html) {
  if (!html) return [];
  const found = [];
  const hRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = hRe.exec(html)) !== null) {
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, '').trim());
    if (text) found.push({ pos: m.index, block: { type: 'heading', level: parseInt(m[1]), children: [{ type: 'text', text }] } });
  }
  while ((m = pRe.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim());
    if (text) found.push({ pos: m.index, block: { type: 'paragraph', children: [{ type: 'text', text }] } });
  }
  found.sort((a, b) => a.pos - b.pos);
  const blocks = found.map(f => f.block);
  if (!blocks.length) {
    const text = decodeEntities(html.replace(/<[^>]+>/g, '').trim());
    if (text) blocks.push({ type: 'paragraph', children: [{ type: 'text', text }] });
  }
  return blocks;
}

function htmlToPlain(html, max = 300) {
  if (!html) return '';
  const plain = decodeEntities(
    html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\[&hellip;\]/g, '…').trim()
  );
  return plain.length > max ? plain.slice(0, max - 1) + '…' : plain;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== AB.dk WordPress → Strapi catch-up ===');
  console.log(`Strapi: ${STRAPI}  |  WP: ${WP}  |  Locale: ${LOCALE}`);

  console.log('\n[Diff] Fetching WP posts...');
  const wpPosts = await wpGetAllSlugs();
  console.log(`  WP: ${wpPosts.length} published posts.`);

  console.log('\n[Diff] Checking which already exist in Strapi (batched, to avoid the heavy full-listing query)...');
  const existingSlugs = await strapiFindExistingSlugs(wpPosts.map(p => p.slug), LOCALE);
  // Strapi stamps `publishedAt` with real creation time no matter what's sent
  // (confirmed: a direct PUT with a custom publishedAt is silently ignored on
  // this instance) — `originalPublishedAt` (set below) is the field that
  // actually preserves the true WP date and is what the frontend sorts/
  // displays by. Order of creation here no longer matters for display, but
  // oldest-first still reads better in the progress log.
  const missing = wpPosts
    .filter(p => !existingSlugs.has(p.slug) && !EXCLUDE_SLUGS.has(p.slug))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const excludedCount = wpPosts.filter(p => !existingSlugs.has(p.slug) && EXCLUDE_SLUGS.has(p.slug)).length;
  console.log(`  Strapi has ${existingSlugs.size} of them already. Missing: ${missing.length}${excludedCount ? ` (+${excludedCount} excluded)` : ''}`);
  missing.forEach(p => console.log(`    - ${p.date}  ${p.slug}`));

  if (missing.length === 0) {
    console.log('\n✓ Nothing to import — Strapi is already caught up.');
    return;
  }

  console.log('\n[Categories] Loading existing Strapi categories...');
  const categoryMap = await strapiGetCategories(LOCALE);
  console.log(`  ${categoryMap.size} categories found: ${[...categoryMap.keys()].join(', ')}`);

  let ok = 0, fail = 0;

  for (let i = 0; i < missing.length; i++) {
    const { slug } = missing[i];
    const prefix = `[${i + 1}/${missing.length}]`;
    try {
      const post = await wpGetPostBySlug(slug);
      if (!post) throw new Error('post disappeared between diff and fetch');

      // Categories: map by name, creating any category Strapi doesn't have yet.
      // A handful of posts on the "en" site are still tagged with the
      // Danish-language category term (a WPML tagging gap on the WP side),
      // so remap those to their English equivalent instead of creating a
      // stray Danish-named category on the English locale.
      const CATEGORY_NAME_OVERRIDES = LOCALE === 'en' ? { Nyheder: "What's new" } : {};
      const categoryConnects = [];
      for (const wpCatId of post.categories ?? []) {
        let name = await wpGetCategoryName(wpCatId);
        if (!name || name === 'Uncategorized') continue;
        name = CATEGORY_NAME_OVERRIDES[name] ?? name;
        let documentId = categoryMap.get(name);
        if (!documentId) {
          documentId = await strapiCreateCategory(name, LOCALE);
          categoryMap.set(name, documentId);
          console.log(`  + created category "${name}"`);
        }
        categoryConnects.push({ documentId });
      }

      // Featured image
      let imageId = null;
      if (post.featured_media) {
        const sourceUrl = await wpGetMediaUrl(post.featured_media);
        if (sourceUrl) {
          const ext = sourceUrl.split('.').pop()?.split('?')[0] ?? 'jpg';
          imageId = await strapiUploadImage(sourceUrl, `${post.slug}.${ext}`);
        }
      }

      const description = htmlToPlain(post.excerpt?.rendered ?? post.content?.rendered ?? '', 300);

      await strapiCreateOrLinkArticle({
        data: {
          title: post.title.rendered,
          slug: post.slug,
          description,
          content: htmlToBlocks(post.content?.rendered ?? ''),
          locale: LOCALE,
          publishedAt: post.date,
          originalPublishedAt: post.date,
          ...(categoryConnects.length > 0 ? { categories: { connect: categoryConnects } } : {}),
          ...(imageId ? { image: imageId } : {}),
        },
      });

      ok++;
      console.log(`${prefix} ✓ ${post.title.rendered}`);
    } catch (e) {
      fail++;
      console.warn(`${prefix} ✗ ${slug}: ${e.message}`);
    }
  }

  console.log(`\n✓ Done: ${ok} imported, ${fail} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
