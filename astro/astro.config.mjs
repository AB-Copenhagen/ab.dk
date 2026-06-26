import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import path from 'path';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const EXTENSIONS = ['.ts', '.tsx', '.astro', '.js', '.jsx', '.json'];

// Resolves @/ aliases with extension inference for Rollup SSR builds.
// Vite's built-in alias expansion returns extensionless absolute paths
// which Rollup's load-fallback cannot open; this plugin returns the full path.
const aliasResolver = {
  name: 'alias-resolver',
  enforce: 'pre',
  resolveId(id) {
    if (!id.startsWith('@/')) return null;
    const rel = id.slice(2);
    const base = path.join(srcDir, rel);
    if (existsSync(base)) return base;
    for (const ext of EXTENSIONS) {
      const full = base + ext;
      if (existsSync(full)) return full;
    }
    return null;
  },
};

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
    plugins: [aliasResolver],
  },
});
