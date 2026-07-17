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
