import { mergeConfig } from 'vite';
import type { UserConfig } from 'vite';

/**
 * Strapi 5 bundles prismjs language components (prism-bash, prism-c, etc.) into a
 * shared chunk without including prism-core. Those component files reference `Prism`
 * as a bare global, which is undefined when the chunk first executes, crashing the
 * admin before React mounts.
 *
 * Fix: transform every component file to (a) import the core module first and
 * (b) expose a local `Prism` variable from that import, so the bundler resolves
 * the dependency correctly and executes core before any component code runs.
 */
export default (config: UserConfig): UserConfig =>
  mergeConfig(config, {
    plugins: [
      {
        name: 'prism-component-dep-fix',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          // Target: any prismjs language component (not the core itself)
          if (/node_modules\/prismjs\/components\/prism-(?!core)/.test(id)) {
            return `import __prismCore from 'prismjs';\nvar Prism = __prismCore;\n${code}`;
          }
          return null;
        },
      },
    ],
    build: {
      // public/uploads/ can grow to thousands of local files (this project uses
      // the S3/Wasabi upload provider, so nothing there is actually served in
      // production). Static files are served directly from public/ at runtime via
      // koa-static (@strapi/core's strapi::public middleware) — /uploads/* is
      // excluded from that route entirely — so nothing reads the dist/build copy
      // Vite would otherwise make on every build. Skip it.
      copyPublicDir: false,
    },
  } as UserConfig);
