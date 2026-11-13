import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'url';

import { legacyRedirects } from './src/lib/redirects.ts';

const src = (rel) => fileURLToPath(new URL(`./src/${rel}`, import.meta.url));

export default defineConfig({
  site: 'https://ab.dk',
  output: 'server',
  redirects: legacyRedirects,
  server: { port: 1889 },
  adapter: vercel({
    imageService: true,
    imagesConfig: {
      // Vercel only serves widths from this list — anything else silently
      // falls back to the source's full size. Superset of Vercel's own
      // defaults (640/750/828/1080/1200/1920/2048/3840) plus smaller
      // breakpoints for thumbnails and half-width banners.
      sizes: [320, 400, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    },
  }),
  image: {
    remotePatterns: [
      // SI API team logos (CloudFront CDN)
      { protocol: 'https', hostname: '**.cloudfront.net' },
      // Strapi media uploaded to Wasabi S3
      { protocol: 'https', hostname: '**.wasabisys.com' },
    ],
  },
  integrations: [react()],
  // Block search engine crawlers until production launch.
  // Set ALLOW_SEARCH_INDEXING=true in the production environment (see README).
  env: {
    schema: {
      ALLOW_SEARCH_INDEXING: envField.boolean({
        context: 'server',
        access: 'public',
        default: false,
      }),
    },
  },
  i18n: {
    defaultLocale: 'da',
    locales: ['da', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // sanitize-html depends on htmlparser2, which ships ESM-only (no CJS
      // build) — left external, Astro's SSR output requires() it natively and
      // Node throws ERR_REQUIRE_ESM, crashing every page that renders
      // sanitized content (src/lib/sanitize.ts). Bundling it through Vite
      // instead of requiring it from node_modules at runtime avoids the raw
      // CJS require() entirely.
      //
      // Every package in this list is also a dependency (direct or nested)
      // of sanitize-html. noExternal is NOT transitive — Vite only inlines
      // require()/import calls for packages explicitly listed here, so a
      // bundled package's own unbundled dependency is left as a literal
      // require() inside the output chunk. Vercel's function-bundling
      // dependency tracer then fails to detect that require() (it's inside
      // a rolled-up .mjs chunk, not a plain node_modules file) and omits the
      // package from the deployed function entirely — "Cannot find module"
      // at runtime, one dependency at a time, until the whole tree is listed.
      noExternal: [
        'sanitize-html',
        'htmlparser2',
        'escape-string-regexp',
        'is-plain-object',
        'launder',
        'parse-srcset',
        'postcss',
        'dayjs', // launder's dependency
        'nanoid', // postcss's dependency
        'picocolors', // postcss's dependency
        'source-map-js', // postcss's dependency
      ],
    },
    resolve: {
      alias: [
        // Explicit file-level aliases for extensionless TS/TSX imports.
        // Vite's directory alias does not infer extensions in Rollup SSR builds.
        {
          find: '@/components/islands/ArticleContent',
          replacement: src('components/islands/ArticleContent.tsx'),
        },
        {
          find: '@/components/islands/ArticleSearch',
          replacement: src('components/islands/ArticleSearch.tsx'),
        },
        {
          find: '@/components/islands/MobileMenu',
          replacement: src('components/islands/MobileMenu.tsx'),
        },
        {
          find: '@/components/widgets/SiWidget',
          replacement: src('components/widgets/SiWidget.tsx'),
        },
        {
          find: '@/components/islands/VideoPlayer',
          replacement: src('components/islands/VideoPlayer.tsx'),
        },
        { find: '@/lib/config/ab', replacement: src('lib/config/ab.ts') },
        { find: '@/lib/i18n', replacement: src('lib/i18n.ts') },
        { find: '@/lib/mailgun', replacement: src('lib/mailgun.ts') },
        { find: '@/lib/media', replacement: src('lib/media.ts') },
        { find: '@/lib/nav-config', replacement: src('lib/nav-config.ts') },
        { find: '@/lib/si/client', replacement: src('lib/si/client.ts') },
        {
          find: '@/lib/strapi/client',
          replacement: src('lib/strapi/client.ts'),
        },
        { find: '@/lib/utils', replacement: src('lib/utils.ts') },
        // Directory alias handles all remaining @/ imports (e.g. *.astro with explicit ext).
        { find: '@', replacement: src('') },
      ],
    },
  },
});
