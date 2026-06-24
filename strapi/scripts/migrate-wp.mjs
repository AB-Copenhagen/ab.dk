#!/usr/bin/env node
/**
 * Migrate WordPress posts + categories → Strapi
 *
 * Requirements: Node 18+, Strapi running at localhost:1337
 *
 * Usage:
 *   STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs
 *
 * Get token: Strapi admin → Settings → API Tokens → Create → Full Access
 *
 * Options (env vars):
 *   STRAPI_URL   default http://localhost:1337
 *   WP_URL       default https://ab.dk
 *   DRY_RUN=1    print what would be imported without writing to Strapi
 *   LIMIT=N      only import the first N posts (useful for testing)
 */

const WP       = (process.env.WP_URL ?? 'https://ab.dk') + '/wp-json/wp/v2';
const STRAPI   = process.env.STRAPI_URL ?? 'http://localhost:1337';
const TOKEN    = process.env.STRAPI_TOKEN;
const DRY_RUN  = process.env.DRY_RUN === '1';
const LIMIT    = process.env.LIMIT ? parseInt(process.env.LIMIT) : Infinity;

if (!TOKEN && !DRY_RUN) {
  console.error('Set STRAPI_TOKEN. Get it: Strapi admin → Settings → API Tokens → Create (Full Access)');
  process.exit(1);
}

// ── WordPress helpers ─────────────────────────────────────────────────────────

async function wpFetch(path, params = {}) {
  const url = new URL(`${WP}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP ${path} → ${res.status}`);
  return { json: await res.json(), headers: res.headers };
}

async function wpGetAll(path, params = {}) {
  const all = [];
  let page = 1;
  while (true) {
    const { json, headers } = await wpFetch(path, { ...params, per_page: 100, page });
    if (!Array.isArray(json) || json.length === 0) break;
    all.push(...json);
    const totalPages = parseInt(headers.get('x-wp-totalpages') ?? '1');
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

// ── Strapi helpers ────────────────────────────────────────────────────────────

const authHeader = { Authorization: `Bearer ${TOKEN}` };

async function strapiPost(path, body) {
  if (DRY_RUN) {
    console.log(`[DRY] POST ${path}`, JSON.stringify(body.data).slice(0, 120));
    return { data: { documentId: 'dry-run-id' } };
  }
  const res = await fetch(`${STRAPI}/api${path}`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const detail = json?.error?.details ?? json?.error?.message ?? JSON.stringify(json);
    throw new Error(`${res.status}: ${detail}`);
  }
  return json;
}

// Download a remote image and upload it to Strapi's media library.
// Returns the Strapi media id, or null on failure.
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

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8230;/g, '…')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ');
}

function htmlToBlocks(html) {
  if (!html) return [];
  const blocks = [];

  // Headings
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  // Paragraphs — including wp-block-paragraph
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;

  // Build an ordered list of {pos, block} so headings appear in correct order
  const found = [];

  let m;
  const hre = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = hre.exec(html)) !== null) {
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, '').trim());
    if (text) found.push({ pos: m.index, block: { type: 'heading', level: parseInt(m[1]), children: [{ type: 'text', text }] } });
  }

  const pre = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = pre.exec(html)) !== null) {
    const inner = m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    const text = decodeEntities(inner).trim();
    if (text) found.push({ pos: m.index, block: { type: 'paragraph', children: [{ type: 'text', text }] } });
  }

  found.sort((a, b) => a.pos - b.pos);
  blocks.push(...found.map(f => f.block));

  // Fallback: if nothing matched, dump stripped text as one paragraph
  if (blocks.length === 0) {
    const text = decodeEntities(html.replace(/<[^>]+>/g, '').trim());
    if (text) blocks.push({ type: 'paragraph', children: [{ type: 'text', text }] });
  }

  return blocks;
}

// Strip HTML and truncate for the description field
function htmlToPlainText(html, maxLen = 300) {
  if (!html) return '';
  const plain = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\[&hellip;\]/g, '…')
      .trim()
  );
  return plain.length > maxLen ? plain.slice(0, maxLen - 1) + '…' : plain;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== Migrating ab.dk WordPress → Strapi ===');
  console.log(`Strapi: ${STRAPI}`);

  // ── Step 1: Categories ────────────────────────────────────────────────────
  console.log('\n[1/2] Fetching WordPress categories...');
  const wpCategories = await wpGetAll('/categories', {
    _fields: 'id,name,slug,count',
  });

  // Skip Uncategorized and empty categories
  const usefulCats = wpCategories.filter(
    c => !c.slug.startsWith('uncategorized') && c.count > 0
  );
  console.log(`Found ${usefulCats.length} categories with content`);

  /** Maps WP category id → Strapi documentId */
  const wpCatIdToStrapi = {};

  for (const cat of usefulCats) {
    try {
      const { data } = await strapiPost('/categories', {
        data: { name: cat.name, locale: 'da' },
      });
      wpCatIdToStrapi[cat.id] = data.documentId;
      console.log(`  ✓ ${cat.name} (${cat.count} posts)`);
    } catch (e) {
      console.warn(`  ✗ ${cat.name}: ${e.message}`);
    }
  }

  // ── Step 2: Posts ─────────────────────────────────────────────────────────
  console.log('\n[2/2] Fetching WordPress posts...');
  const allPosts = await wpGetAll('/posts', {
    status: 'publish',
    _fields: 'id,title,slug,date,excerpt,content,categories,featured_media',
  });

  const posts = allPosts.slice(0, LIMIT);
  console.log(`Importing ${posts.length} of ${allPosts.length} published posts\n`);

  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prefix = `[${i + 1}/${posts.length}]`;

    try {
      // Featured image
      let imageId = null;
      if (post.featured_media) {
        const { json: media } = await wpFetch(`/media/${post.featured_media}`, {
          _fields: 'source_url,slug',
        });
        if (media?.source_url) {
          const ext = media.source_url.split('.').pop()?.split('?')[0] ?? 'jpg';
          imageId = await uploadImage(media.source_url, `${post.slug}.${ext}`);
        }
      }

      // Category relations (Strapi 5 connect syntax)
      const categoryConnects = (post.categories ?? [])
        .map(wpId => wpCatIdToStrapi[wpId])
        .filter(Boolean)
        .map(documentId => ({ documentId }));

      const description = htmlToPlainText(post.excerpt?.rendered ?? post.content?.rendered ?? '', 300);

      const body = {
        data: {
          title: post.title.rendered,
          slug: post.slug,
          description,
          content: htmlToBlocks(post.content?.rendered ?? ''),
          locale: 'da',
          publishedAt: post.date,
          ...(categoryConnects.length > 0
            ? { categories: { connect: categoryConnects } }
            : {}),
          ...(imageId ? { image: imageId } : {}),
        },
      };

      await strapiPost('/articles', body);
      ok++;
      console.log(`${prefix} ✓ ${post.title.rendered}`);
    } catch (e) {
      fail++;
      console.warn(`${prefix} ✗ ${post.slug}: ${e.message}`);
    }
  }

  console.log(`\n✓ Done: ${ok} imported, ${fail} failed, ${skip} skipped.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
