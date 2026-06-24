# AB.dk — Akademisk Boldklub

Official website for [Akademisk Boldklub](https://ab.dk) (AB), a Danish football club founded in 1889.

## Stack

| Layer | Technology |
|---|---|
| CMS | Strapi 5 |
| Frontend | Next.js 15 (App Router) |
| Auth | Descope |
| Live match data | SportsInnovation API |
| Storefront | Shopify Embedded (shop.ab.dk) |
| Translation | DeepL (via strapi-plugin-translate) |

## Project structure

```
ab.dk/
├── next/        # Next.js 15 frontend
└── strapi/      # Strapi 5 CMS
```

## Prerequisites

- Node.js v18+
- Yarn (via Corepack: `corepack enable`)

## Local setup

### 1. Clone and install

```sh
git clone https://github.com/AB-Copenhagen/ab.dk.git
cd ab.dk
yarn install
```

### 2. Configure environment variables

```sh
cp next/.env.example next/.env.local
cp strapi/.env.example strapi/.env
```

Fill in the required values in both files — see the sections below.

### 3. Seed Strapi with content

Start Strapi first, then import the seed data:

```sh
# Terminal 1
cd strapi && yarn dev

# Terminal 2 (once Strapi is ready at localhost:1337)
cd strapi && yarn seed
```

### 4. Start both servers

From the repo root:

```sh
yarn dev
```

Strapi starts first and waits until ready before launching Next.js.

| Service | URL |
|---|---|
| Next.js frontend | http://localhost:3000 |
| Strapi admin | http://localhost:1337/admin |

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

# SportsInnovation
SI_ACCESS_TOKEN=

# DeepL auto-translation
DEEPL_API_KEY=        # from deepl.com/pro-api (free tier available)
DEEPL_API_FREE=true   # set false for paid DeepL plan
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
| AB Green | `#006A52` | Primary, CTAs, active states |
| AB Gold | `#D6A02A` | Headings, accents |
| AB Beige | `#D3BC8D` | Secondary text |
| AB Neon | `#00FF1F` | Live match indicator |
| Rich Black | `#0A0A09` | Page background |

## Content migration

To import existing posts from the WordPress site into Strapi:

```sh
# Requires Strapi running + a Full Access API token from Strapi admin
STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs

# Dry run (no writes)
DRY_RUN=1 STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs

# Test with first 5 posts
LIMIT=5 STRAPI_TOKEN=<token> node strapi/scripts/migrate-wp.mjs
```

The script fetches 654 published posts and all categories from `ab.dk/wp-json/wp/v2`, downloads featured images, converts HTML to Strapi blocks, and publishes everything under the `da` locale.

## Localization

The site supports Danish (`da`, default) and English (`en`). Content is authored in Danish in Strapi. The DeepL plugin adds a **Translate** button in the content editor to auto-generate English versions for review before publishing.

To add the Danish locale in Strapi: **Settings → Internationalization → Add locale → Danish (da)**.

## Key services

| Service | Purpose | Docs |
|---|---|---|
| [Descope](https://descope.com) | Member auth, session management | [SDK docs](https://docs.descope.com/sdk-reference/nextjs) |
| [SportsInnovation](https://api.superliga.dk) | Live fixtures, standings, scores | Internal access |
| [Shopify](https://shop.ab.dk) | Club shop (Storefront API) | [Storefront API](https://shopify.dev/docs/api/storefront) |
| [DeepL](https://deepl.com) | DA→EN auto-translation | [API docs](https://developers.deepl.com/docs) |
