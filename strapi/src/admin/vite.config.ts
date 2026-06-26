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
  } as UserConfig);
