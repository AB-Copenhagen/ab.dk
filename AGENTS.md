# AGENTS.md

Guide for AI assistants and contributors working on ab.dk.

## Active codebase

Edit **`src/`** only. Do not modify `next/` or `astro/` unless explicitly migrating legacy code.

## Stack

Astro 5 (SSR, Node adapter) · React islands · Tailwind v4 · Strapi v5 CMS · TypeScript strict

## Before submitting changes

```bash
npm run check        # TypeScript + Astro diagnostics
npm run build        # Production build
npm run format:check # Prettier
```

## Cursor rules

Project conventions live in `.cursor/rules/`:

| Rule                     | Topic                                      |
| ------------------------ | ------------------------------------------ |
| `ab-project.mdc`         | Overview, commands, folder layout          |
| `astro-pages.mdc`        | Pages, prerender, frontmatter strings      |
| `i18n-routing.mdc`       | Danish `/` vs English `/en/`               |
| `data-apis.mdc`          | Strapi, SI API, Mailgun                    |
| `react-islands.mdc`      | Client-side React                          |
| `brand-styling.mdc`      | Design tokens, brand rules                 |
| `tailwind.mdc`           | Tailwind patterns                          |
| `naming-conventions.mdc` | Function, file, type naming                |
| `typescript.mdc`         | TS config, imports, server/client boundary |

## Key paths

```
src/pages/          File-based routes (mirror da + en/)
src/components/     Astro components + islands/
src/lib/            Strapi client, SI client, i18n, utils
src/layouts/        Base.astro
src/styles/         tokens.css (brand) + global.css
strapi/             CMS (separate Yarn process)
```

## i18n

- Danish: no URL prefix (`/kampe`)
- English: `/en/` prefix (`/en/kampe`)
- UI strings: `t[locale].*` from `@/lib/i18n`

## Environment

Copy `.env.example` → `.env.local`. See README for required variables.
