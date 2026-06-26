import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const src = (rel) => fileURLToPath(new URL(`./src/${rel}`, import.meta.url));

import { readdirSync } from 'fs';
import path from 'path';

// Debug: verify paths on build server
const cwd = process.cwd();
console.log('[ab] cwd:', cwd);
try { console.log('[ab] cwd/src/lib:', readdirSync(path.join(cwd, 'src/lib'))); } catch(e) { console.log('[ab] cwd/src/lib ERR:', e.message); }
try { console.log('[ab] cwd/src/lib/strapi:', readdirSync(path.join(cwd, 'src/lib/strapi'))); } catch(e) { console.log('[ab] cwd/src/lib/strapi ERR:', e.message); }

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  i18n: {
    defaultLocale: 'da',
    locales: ['da', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    resolve: {
      alias: [
        // Explicit file-level aliases for extensionless TS/TSX imports.
        // Vite's directory alias does not infer extensions in Rollup SSR builds.
        { find: '@/components/islands/ArticleContent', replacement: src('components/islands/ArticleContent.tsx') },
        { find: '@/components/islands/ArticleSearch',  replacement: src('components/islands/ArticleSearch.tsx') },
        { find: '@/lib/config/ab',                    replacement: src('lib/config/ab.ts') },
        { find: '@/lib/nav-config',                   replacement: src('lib/nav-config.ts') },
        { find: '@/lib/si/client',                    replacement: src('lib/si/client.ts') },
        { find: '@/lib/strapi/client',                replacement: src('lib/strapi/client.ts') },
        { find: '@/lib/utils',                        replacement: src('lib/utils.ts') },
        // Directory alias handles all remaining @/ imports (e.g. *.astro with explicit ext).
        { find: '@', replacement: src('') },
      ],
    },
  },
});
