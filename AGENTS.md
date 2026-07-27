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

## Project rules

Conventions live in `.cursor/rules/` — single source of truth for Cursor and Claude Code.

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

### Claude Code

Claude Code reads `CLAUDE.md` at the repo root, which imports this file and all `.cursor/rules/*.mdc` files. Run `/memory` in a session to verify loaded files.

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

## Pending content — player profiles (Strapi)

The player detail page layout is fully built and CMS-driven. The **Player** content
type (`api::player.player`) exists in Strapi but no entries have been created yet.

Until entries are added, pages show:

- Player Bio → placeholder text ("Spillerprofil tilføjes snart")
- Quote section → hidden
- Photo gallery → hidden
- Nickname / Former Clubs in metadata bar → hidden

**To populate a player entry in Strapi admin → Content Manager → Player:**

| Field             | Description                                                  | Example                          |
| ----------------- | ------------------------------------------------------------ | -------------------------------- |
| `siPlayerId`      | SI API player ID (from `/spiller/{id}-{slug}` URL)           | `658977`                         |
| `nickname`        | Short name or nickname                                       | `"Adri"`                         |
| `formerClubs`     | Comma-separated previous clubs                               | `"FC Augsburg II, SGV Freiberg"` |
| `bio` (da + en)   | 2–3 paragraph player biography                               | —                                |
| `quote` (da + en) | One memorable player quote, no surrounding quotes            | —                                |
| `gallery`         | Action photos — first image shown full-width, next 3 in grid | —                                |

> Restart Strapi after the first deploy so it picks up the new content type.

## Managing partners (Strapi)

The **Partner** content type (`api::partner.partner`) is localized (da/en). Non-localized
fields (logo, url, category, sortOrder, slug) are shared across locales automatically —
only `description`, `howLong`, and `highlights` need separate DA/EN text.

**Important:** Strapi requires a separate row per locale for a partner to appear in that
locale's page/listing at all — this applies even to non-localized fields. When creating a
new partner, after saving the first locale, use Strapi admin's **"Fill in from another
locale"** action (top of the entry editor) to create the other locale's row before
publishing both. Skipping this means the partner is simply invisible on the other
language's site, not just missing a translation.

The footer logo strip (`Footer.astro`) always reads the `da` row regardless of page
language, since none of the fields it shows (logo, name, url, sizing) vary by locale — a
missing `en` row never affects the footer.

| Field                    | Localized | Description                                           |
| ------------------------ | :-------: | ----------------------------------------------------- |
| `name`                   |    no     | Company name                                          |
| `slug`                   |    no     | Auto-generated from `name`; used in the page URL      |
| `logo`                   |    no     | Logo image                                            |
| `url`                    |    no     | Website link                                          |
| `category`               |    no     | Tier: `supreme` / `premium` / `local-hero` / `ab1889` |
| `logoWidth`/`logoHeight` |    no     | Display size in px (footer + listing card)            |
| `sortOrder`              |    no     | Ascending display order within a tier                 |
| `description`            |    yes    | Detail-page bio paragraph                             |
| `howLong`                |    yes    | "Varighed" / "How long" text on the detail page       |
| `highlights`             |    yes    | "Højdepunkter" / "Highlights" text on the detail page |
| `keyContacts`            |    no     | Repeatable: name, role, email, phone                  |

A one-off script (`scripts/seed-partners.mjs`) migrated the partners previously
hardcoded in `src/data/partners.ts` into Strapi. New partners going forward are entered
directly in Strapi admin — `src/data/partners.ts` now only holds `PartnerTier`/`TIER_LABELS`.

> Restart Strapi after the first deploy so it picks up the new content type.
