# AB 1889

Website for [Akademisk Boldklub](https://ab.dk) — Denmark's oldest football club, founded 1889.

Built with Astro 5 + Strapi, deployed as a Docker container on datum-cloud/compute.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Astro 5, TypeScript, `output: 'server'` (hybrid) |
| Adapter | `@astrojs/node` standalone — runs in the Docker container |
| Styling | Tailwind v3 + CSS custom property token layer (`src/styles/tokens.css`) |
| CMS | Strapi v5 (`strapi/`) — articles, pages, products, global config |
| Auth | Descope — web component login flow, session cookie `DS` |
| League data | Sports Innovation (`dash.si-ab.com`) widget embeds |
| Email | Mailgun EU REST API — newsletter subscribe + contact |
| Media | Wasabi S3-compatible object storage |
| Shop | Shopify (`shop.ab.dk`) — outbound links, optional Storefront API |
| i18n | Astro built-in — `da` default (no prefix), `en` secondary (`/en/`) |

---

## Project structure

```
/
├── src/
│   ├── assets/brand/        # Master SVGs — monogram, crest, pattern, numerals
│   ├── components/
│   │   ├── brand/           # Logo.astro, Crest.astro, SponsorLockup.astro
│   │   ├── layout/          # LangSwitch.astro
│   │   ├── islands/         # React islands (MobileMenu, ArticleSearch, ArticleContent)
│   │   └── widgets/         # SiWidget.astro + SiWidget.tsx
│   ├── layouts/Base.astro
│   ├── lib/
│   │   ├── strapi/client.ts # Strapi REST client (fetchCollectionType, fetchSingleType)
│   │   ├── si/client.ts     # Sports Innovation API client
│   │   ├── i18n.ts          # Locale helpers + UI string dictionaries
│   │   ├── mailgun.ts       # Mailgun EU send helpers
│   │   └── media.ts         # Wasabi URL builder
│   ├── middleware.ts         # Locale resolution + Descope session guard
│   ├── pages/               # File-based routing (da at root, en/ prefix)
│   └── styles/
│       ├── tokens.css        # Brand design tokens — source of truth
│       └── global.css
├── public/
│   └── fonts/               # ABC Camera Plain web files (licensed — not committed)
├── strapi/                  # Strapi CMS (separate Node process)
├── Dockerfile               # Two-stage Node 22 alpine build for datum-cloud
├── .env.example             # All required environment variables documented
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
```

---

## Local development

**Prerequisites:** Node 22, npm, PostgreSQL (for Strapi)

### 1. Environment

```bash
cp .env.example .env.local
# Fill in STRAPI_URL, STRAPI_API_TOKEN at minimum for local content
```

### 2. Astro frontend

```bash
npm install
npm run dev
# → http://localhost:4321
```

Pages load without Strapi (content falls back to empty state). For live CMS content, start Strapi first.

### 3. Strapi CMS

Requires PostgreSQL. Start it, then:

```bash
cd strapi
yarn install   # Strapi uses Yarn 4 via Corepack
yarn develop
# → http://localhost:1337/admin
```

If PostgreSQL isn't running: `brew services start postgresql@14` (adjust version).

To run Strapi with SQLite instead (no Postgres required), add `DATABASE_CLIENT=sqlite` to `strapi/.env`.

---

## Environment variables

See `.env.example` for the full list with descriptions. Required at minimum:

```
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=          # Generate in Strapi admin → Settings → API Tokens

SI_API_BASE=               # Sports Innovation API base URL
SI_API_KEY=                # Sports Innovation API key

DESCOPE_PROJECT_ID=        # Descope project ID — enables login/profile pages
```

Secrets are injected as environment variables on the compute instance — never committed.

---

## Deploy

The app runs as a Docker container on datum-cloud/compute.

```bash
# Build
docker build -t ab-1889 .

# Run locally
docker run -p 4321:4321 --env-file .env.local ab-1889
```

Health check endpoint: `GET /api/health` → `{"ok":true}`

The container entrypoint is `node ./dist/server/entry.mjs` (Astro Node standalone output).

---

## Brand

Design tokens live in `src/styles/tokens.css` and are the single source of truth for all colour and typography decisions.

| Token | Value | Note |
|---|---|---|
| `--ab-green` | `#006A52` | Primary — shirts, headlines, CTAs |
| `--ab-gold` | `#D6A02A` | Pantone 131 C — accents, numerals |
| `--ab-beige` | `#D3BC8D` | Pantone 467 C — use minimally |
| `--ab-neon` | `#00FF1F` | Pantone 802 C — **digital only**, never print |
| `--font-display` | ABC Camera Plain → Helvetica | Web license required to self-host |

**Hard rules:**
- Never recreate the AB monogram or `1889` numeral from a typeface — always use `src/assets/brand/`
- Neon green is for on-screen accents only (focus rings, live indicators)
- Sponsor lockup: AB 1889 always primary, vertical rule separator, side-by-side only
- The owl crest and the AB monogram never appear together in a sponsor lockup
