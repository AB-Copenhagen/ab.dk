# AB.dk — Akademisk Boldklub

Official website for [Akademisk Boldklub](https://ab.dk) (AB), a Danish football club founded in 1889.

## Stack

| Layer | Technology |
|---|---|
| CMS | Strapi 5 |
| Frontend | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL serverless) |
| Auth | Descope |
| Media storage | Wasabi (S3-compatible) |
| Email | Mailgun |
| Live match data | SportsInnovation API |
| Storefront | Shopify Embedded (shop.ab.dk) |
| Translation | DeepL (via strapi-plugin-translate) |

## Project structure

```
ab.dk/
├── next/            # Next.js 15 frontend
│   ├── app/         # App Router pages ([locale]/...)
│   ├── components/  # UI components (navbar, footer, SI widgets, ...)
│   └── lib/         # Strapi fetch helpers, Shopify client, utilities
└── strapi/          # Strapi 5 CMS
    ├── config/      # Plugins, database, server config
    └── scripts/     # Migration and maintenance scripts
```

## Prerequisites

- **Node.js v20 LTS** — required for Strapi 5 (`nvm use 20`)
- **Yarn** — enabled via Corepack (`corepack enable`)

> ⚠️ Node 24 is not compatible with Strapi 5. Pin to Node 20 with `nvm use 20` before running Strapi or any scripts.

## Local setup

### 1. Clone and install

```sh
git clone https://github.com/AB-Copenhagen/ab.dk.git
cd ab.dk
nvm use 20
yarn install
```

### 2. Configure environment variables

```sh
cp next/.env.example next/.env.local
cp strapi/.env.example strapi/.env
```

Fill in the required values — see the **Environment variables** section below.

### 3. Start both servers

```sh
yarn dev
```

| Service | URL |
|---|---|
| Next.js frontend | http://localhost:3000 |
| Strapi admin | http://localhost:1337/admin |

### 4. Seed Strapi with content

Once Strapi is running, import the seed data and (optionally) migrate WordPress content:

```sh
# In a second terminal
cd strapi && yarn seed

# Optional: import all posts + categories from ab.dk WordPress (da + en)
STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs
```

Get the API token from **Strapi admin → Settings → API Tokens → Create (Full Access)**.

## Environment variables

### `next/.env.local`

```env
# Strapi
NEXT_PUBLIC_API_URL=http://localhost:1337

# Descope auth
NEXT_PUBLIC_DESCOPE_PROJECT_ID=          # from Descope console
DESCOPE_PROJECT_ID=
DESCOPE_BASE_URL=https://auth.ab.dk
DESCOPE_MANAGEMENT_KEY=

# Shopify Storefront
SHOPIFY_STORE_DOMAIN=shop.ab.dk
SHOPIFY_APP_CLIENT_ID=
SHOPIFY_STOREFRONT_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# SportsInnovation
SI_ACCESS_TOKEN=
AB_TEAM_ID=9805
```

### `strapi/.env`

```env
# App
HOST=0.0.0.0
PORT=1337
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=

CLIENT_URL=http://localhost:3000
PREVIEW_SECRET=

# Database (Supabase PostgreSQL)
# Connection string from: Supabase → Project Settings → Database → Connection string (URI)
# Use the session mode pooler (port 5432) — transaction mode (6543) is NOT compatible with Strapi
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# SportsInnovation
SI_ACCESS_TOKEN=

# Mailgun email
MAILGUN_API_KEY=
MAILGUN_DOMAIN=mail.ab.dk
MAILGUN_HOST=https://api.eu.mailgun.net   # omit for US accounts
MAILGUN_FROM=noreply@ab.dk
MAILGUN_REPLY_TO=info@ab.dk

# DeepL auto-translation
DEEPL_API_KEY=        # from deepl.com/pro-api (free tier available)
DEEPL_API_FREE=true   # set false for paid DeepL plan

# Wasabi object storage
WASABI_ACCESS_KEY_ID=
WASABI_SECRET_ACCESS_KEY=
WASABI_BUCKET=ab-media
WASABI_REGION=eu-central-1
WASABI_ENDPOINT=https://s3.eu-central-1.wasabisys.com
```

## Fonts

The site uses **ABC Camera Plain** (Regular 400, Medium 500, Heavy 800) by ABC Dinamo. Font files are excluded from this repository due to the commercial license. Place them in `next/public/fonts/` before running locally:

```
next/public/fonts/
  ABCCameraPlain-Regular.woff2
  ABCCameraPlain-Medium.woff2
  ABCCameraPlain-Heavy.woff2
```

## Brand

| Token | Value | Usage |
|---|---|---|
| AB Green | `#006A52` | Primary — CTAs, active states, navbar |
| AB Gold | `#D6A02A` | Headings, accents, pre-header highlights |
| AB Beige | `#D3BC8D` | Secondary text, utility links |
| AB Neon | `#00FF1F` | Live match indicators only |
| Rich Black | `#0A0A09` | Page background |

## Content migration

The migration script imports all published posts and categories from the existing WordPress site into Strapi for both `da` and `en` locales, including featured images.

```sh
# Full import (both locales)
STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs

# Wipe existing content then re-import
CLEAN=1 STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs

# Dry run — no writes
DRY_RUN=1 STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs

# Test with first 5 posts, Danish only
LIMIT=5 LOCALE=da STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs
```

## Media storage (Wasabi)

All media uploads go to the `ab-media` Wasabi bucket. To migrate existing local Strapi uploads to Wasabi (run with Strapi stopped):

```sh
node --env-file=strapi/.env strapi/scripts/sync-to-wasabi.mjs
```

The script uploads all local files and their thumbnail variants, updates the Strapi database to use Wasabi URLs, and is resume-safe — already-uploaded files are skipped.

## Localization

The site supports **Danish (`da`, default)** and **English (`en`)**. Content is authored in Danish in Strapi. The DeepL plugin adds a **Translate** button in the content editor to auto-generate English versions for review before publishing.

Set Danish as the default locale: **Strapi admin → Settings → Internationalization → Danish → Set as default**.

## Database migration (SQLite → Supabase)

When setting up a fresh environment or migrating an existing SQLite install, use Strapi's built-in export/import. Run all commands from inside `strapi/`:

```sh
cd strapi

# 1. Export content from SQLite (skips asset binaries — files stay on Wasabi)
DATABASE_CLIENT=sqlite npx strapi export --no-encrypt --file ../strapi-export --exclude files

# 2. Start Strapi with PostgreSQL to bootstrap the schema, then Ctrl+C once running
yarn develop

# 3. Import content into PostgreSQL
npx strapi import --file ../strapi-export.tar.gz --force-yes
```

> The `--exclude files` flag skips re-downloading media binaries from Wasabi. All file metadata (URLs, hashes) is included in the entity export and imports correctly.

## Key services

| Service | Purpose | Docs |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL serverless database | [Dashboard](https://supabase.com/dashboard) |
| [Descope](https://descope.com) | Member auth, session management | [SDK docs](https://docs.descope.com/sdk-reference/nextjs) |
| [Wasabi](https://wasabi.com) | Media object storage (S3-compatible) | [Console](https://console.wasabisys.com) |
| [Mailgun](https://mailgun.com) | Transactional email from Strapi | [API docs](https://documentation.mailgun.com) |
| [SportsInnovation](https://api.superliga.dk) | Live fixtures, standings, scores | Internal |
| [Shopify](https://shop.ab.dk) | Club shop via Storefront API | [Storefront API](https://shopify.dev/docs/api/storefront) |
| [DeepL](https://deepl.com) | DA→EN auto-translation in Strapi | [API docs](https://developers.deepl.com/docs) |
