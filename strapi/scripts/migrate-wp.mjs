#!/usr/bin/env node
/**
 * Migrate WordPress posts + categories → Strapi (da + en)
 *
 * Requirements: Node 18+, Strapi running at localhost:1337
 *
 * Usage:
 *   STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs
 *
 * Get token: Strapi admin → Settings → API Tokens → Create → Full Access
 *
 * Options (env vars):
 *   STRAPI_URL    default http://localhost:1337
 *   WP_URL        default https://ab.dk
 *   CLEAN=1       delete all existing articles + categories before importing
 *   DRY_RUN=1     print what would be imported without writing to Strapi
 *   LOCALE=da|en  only import one locale (default: both)
 *   LIMIT=N       only import first N posts per locale (useful for testing)
 */

const WP      = (process.env.WP_URL   ?? 'https://ab.dk') + '/wp-json/wp/v2';
const STRAPI  = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';
const TOKEN   = process.env.STRAPI_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';
const CLEAN   = process.env.CLEAN === '1';
const ONLY    = process.env.LOCALE ?? null; // 'da' | 'en' | null (both)
const LIMIT   = process.env.LIMIT ? parseInt(process.env.LIMIT) : Infinity;

if (!TOKEN && !DRY_RUN) {
  console.error('Set STRAPI_TOKEN. Get it: Strapi admin → Settings → API Tokens → Create (Full Access)');
  process.exit(1);
}

// ── WordPress helpers ─────────────────────────────────────────────────────────

async function wpGetAll(path, params = {}) {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${WP}${path}`);
    Object.entries({ ...params, per_page: 100, page }).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );
    const res = await fetch(url);
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

async function wpGet(path, params = {}) {
  const url = new URL(`${WP}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP ${path} → ${res.status}`);
  return res.json();
}

// ── Strapi helpers ────────────────────────────────────────────────────────────

const authHeader = { Authorization: `Bearer ${TOKEN}` };

async function strapiGet(path) {
  const res = await fetch(`${STRAPI}/api${path}`, { headers: authHeader });
  if (!res.ok) throw new Error(`Strapi GET ${path} → ${res.status}`);
  return res.json();
}

async function strapiPost(path, body, params = {}) {
  if (DRY_RUN) {
    console.log(`[DRY] POST ${path}`, JSON.stringify(body?.data ?? body).slice(0, 120));
    return { data: { documentId: 'dry-run-id' } };
  }
  const url = new URL(`${STRAPI}/api${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${res.status}: ${text.slice(0, 200)}`); }
  if (!res.ok) {
    const detail = json?.error?.details ?? json?.error?.message ?? JSON.stringify(json);
    throw new Error(`${res.status}: ${detail}`);
  }
  return json;
}

async function strapiDelete(path) {
  if (DRY_RUN) { console.log(`[DRY] DELETE ${path}`); return; }
  const res = await fetch(`${STRAPI}/api${path}`, { method: 'DELETE', headers: authHeader });
  if (!res.ok) throw new Error(`Strapi DELETE ${path} → ${res.status}`);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function deleteAllOfType(contentType) {
  let deleted = 0;
  while (true) {
    const { data } = await strapiGet(`/${contentType}?fields[0]=documentId&pagination[pageSize]=100`);
    if (!data?.length) break;
    await Promise.all(data.map(item => strapiDelete(`/${contentType}/${item.documentId}`)));
    deleted += data.length;
    process.stdout.write(`\r  Deleted ${deleted} ${contentType}...`);
  }
  console.log(`\r  ✓ Deleted ${deleted} ${contentType}`);
}

// ── Media upload ──────────────────────────────────────────────────────────────

async function uploadImage(remoteUrl, filename) {
  if (DRY_RUN) return 'dry-run-media-id';
  try {
    const imgRes = await fetch(remoteUrl);
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();
    const form = new FormData();
    form.append('files', new Blob([buffer], { type: contentType }), filename);
    const uploadRes = await fetch(`${STRAPI}/api/upload`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    if (!uploadRes.ok) return null;
    const [file] = await uploadRes.json();
    return file?.id ?? null;
  } catch {
    return null;
  }
}

// ── HTML → Strapi blocks ──────────────────────────────────────────────────────

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
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
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

// ── Locale setup ──────────────────────────────────────────────────────────────

async function ensureLocales() {
  const result = await strapiGet('/i18n/locales');
  const existing = Array.isArray(result) ? result : (result.data ?? []);

  console.log('  Current locales:', existing.map(l => `${l.code}${l.isDefault ? ' (default)' : ''}`).join(', ') || 'none');

  const byCode = Object.fromEntries(existing.map(l => [l.code, l]));

  // Ensure Danish exists — we want it as the default
  if (!byCode['da']) {
    if (DRY_RUN) {
      console.log('  [DRY] Would create locale da');
    } else {
      const created = await strapiPost('/i18n/locales', { code: 'da', name: 'Danish (da)', isDefault: true });
      console.log('  ✓ Created locale da (default)', JSON.stringify(created).slice(0, 80));
      byCode['da'] = created;
    }
  } else if (!byCode['da'].isDefault) {
    // Strapi 5 doesn't allow changing the default locale via REST API.
    // The import will still use locale: 'da' correctly — this only affects
    // which locale loads first in the admin UI.
    console.log('  ⚠ da is not the default locale. To fix: Strapi admin → Settings → Internationalization → Danish → Set as default');
  } else {
    console.log('  ✓ da is already default');
  }

  // Ensure English exists (non-default)
  if (!byCode['en']) {
    if (DRY_RUN) {
      console.log('  [DRY] Would create locale en');
    } else {
      const created = await strapiPost('/i18n/locales', { code: 'en', name: 'English (en)' });
      console.log('  ✓ Created locale en', JSON.stringify(created).slice(0, 80));
    }
  } else {
    console.log('  ✓ en already exists');
  }

  // Verify final state
  const final = await strapiGet('/i18n/locales');
  const finalList = Array.isArray(final) ? final : (final.data ?? []);
  console.log('  Final locales:', finalList.map(l => `${l.code}${l.isDefault ? ' (default)' : ''}`).join(', '));

  const daExists = finalList.some(l => l.code === 'da');
  const enExists = finalList.some(l => l.code === 'en');
  if (!daExists || !enExists) {
    throw new Error(`Locale setup failed — da: ${daExists}, en: ${enExists}. Check Strapi admin → Settings → Internationalization.`);
  }
}

// ── Import one locale ─────────────────────────────────────────────────────────

async function importLocale(locale, categoryMap) {
  console.log(`\nFetching WordPress posts (lang=${locale})...`);
  const all = await wpGetAll('/posts', {
    lang: locale,
    status: 'publish',
    _fields: 'id,title,slug,date,excerpt,content,categories,featured_media',
  });

  const posts = all.slice(0, LIMIT);
  console.log(`Importing ${posts.length} of ${all.length} posts as locale '${locale}'\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prefix = `[${locale}][${i + 1}/${posts.length}]`;

    try {
      // Featured image
      let imageId = null;
      if (post.featured_media) {
        try {
          const media = await wpGet(`/media/${post.featured_media}`, { _fields: 'source_url' });
          if (media?.source_url) {
            const ext = media.source_url.split('.').pop()?.split('?')[0] ?? 'jpg';
            imageId = await uploadImage(media.source_url, `${post.slug}.${ext}`);
          }
        } catch { /* media fetch failed, skip */ }
      }

      const categoryConnects = (post.categories ?? [])
        .map(wpId => categoryMap[locale]?.[wpId])
        .filter(Boolean)
        .map(documentId => ({ documentId }));

      const description = htmlToPlain(post.excerpt?.rendered ?? post.content?.rendered ?? '', 300);

      const body = {
        data: {
          title: post.title.rendered,
          slug: post.slug,
          description,
          content: htmlToBlocks(post.content?.rendered ?? ''),
          locale,
          publishedAt: post.date,
          // Strapi silently overrides `publishedAt` with record-creation time on
          // create — this is the field that actually preserves the true WP date.
          originalPublishedAt: post.date,
          ...(categoryConnects.length > 0 ? { categories: { connect: categoryConnects } } : {}),
          ...(imageId ? { image: imageId } : {}),
        },
      };

      await strapiPost('/articles', body, { locale });
      ok++;
      console.log(`${prefix} ✓ ${post.title.rendered}`);
    } catch (e) {
      fail++;
      console.warn(`${prefix} ✗ ${post.slug}: ${e.message}`);
    }
  }

  return { ok, fail };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== AB.dk WordPress → Strapi migration ===');
  console.log(`Strapi: ${STRAPI}`);

  // ── Step 1: Clean ─────────────────────────────────────────────────────────
  if (CLEAN) {
    console.log('\n[Clean] Deleting existing articles and categories...');
    await deleteAllOfType('articles');
    await deleteAllOfType('categories');
  }

  // ── Step 2: Ensure locales ────────────────────────────────────────────────
  console.log('\n[Locales] Ensuring da + en are configured in Strapi...');
  await ensureLocales();

  // ── Step 3: Categories (both locales) ────────────────────────────────────
  console.log('\n[Categories] Fetching WordPress categories...');

  const locales = ONLY ? [ONLY] : ['da', 'en'];

  // categoryMap[locale][wp_id] = strapi_documentId
  const categoryMap = { da: {}, en: {} };

  for (const locale of locales) {
    const wpCats = await wpGetAll('/categories', {
      lang: locale,
      _fields: 'id,name,slug,count',
    });

    const useful = wpCats.filter(c => !c.slug.startsWith('uncategorized') && c.count > 0);
    console.log(`  ${locale}: ${useful.length} categories`);

    for (const cat of useful) {
      try {
        const { data } = await strapiPost('/categories', { data: { name: cat.name, locale } }, { locale });
        categoryMap[locale][cat.id] = data.documentId;
      } catch (e) {
        console.warn(`  ✗ [${locale}] category ${cat.name}: ${e.message}`);
      }
    }
  }

  // ── Step 4: Articles ──────────────────────────────────────────────────────
  let totalOk = 0, totalFail = 0;

  for (const locale of locales) {
    const { ok, fail } = await importLocale(locale, categoryMap);
    totalOk += ok;
    totalFail += fail;
  }

  console.log(`\n✓ Done: ${totalOk} imported, ${totalFail} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
