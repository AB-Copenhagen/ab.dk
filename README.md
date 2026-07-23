# AB 1889

Website for [Akademisk Boldklub](https://ab.dk) — Denmark's oldest football club, founded 1889.

Built with Astro 7 + Strapi. The frontend deploys to Vercel and the CMS to Strapi Cloud, both automatically on push to `main`.

---

## Stack

| Concern     | Choice                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| Framework   | Astro 7, TypeScript, `output: 'server'` (hybrid)                         |
| Adapter     | `@astrojs/vercel` — SSR functions on Vercel                              |
| Styling     | Tailwind v4 (`@tailwindcss/vite`) + CSS tokens (`src/styles/tokens.css`) |
| CMS         | Strapi v5 (`strapi/`) — articles, pages, products, global config         |
| Auth        | Descope — web component login flow, session cookie `DS`                  |
| League data | Sports Innovation (`dash.si-ab.com`) widget embeds                       |
| Email       | Mailgun EU REST API — newsletter subscribe + contact                     |
| Media       | Wasabi S3-compatible object storage                                      |
| Shop        | Shopify (`shop.ab.dk`) — outbound links, optional Storefront API         |
| i18n        | Astro built-in — `da` default (no prefix), `en` secondary (`/en/`)       |

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
│       └── global.css        # Tailwind v4 entry (@import, @theme, @plugin)
├── public/
│   └── fonts/               # ABC Camera Plain web files (licensed — not committed)
├── strapi/                  # Strapi CMS (separate Node process, deploys to Strapi Cloud)
├── Dockerfile               # Legacy — not used by the current Vercel deploy path
├── .env.example             # All required environment variables documented
├── astro.config.mjs
└── tsconfig.json
```

---

## Local development

**Prerequisites:** Node 22, npm

### 1. Environment

```bash
cp .env.example .env.local
# Point STRAPI_URL at the shared Strapi Cloud instance and fill in STRAPI_API_TOKEN
# (ask a team member for the URL/token — don't spin up a local Strapi instance, see below)
```

### 2. Astro frontend

```bash
npm install
npm run dev
# → http://localhost:1889
```

That's it for day-to-day work — content comes from the shared Strapi Cloud instance, so there's nothing else to run.

### Running Strapi locally (rare — advanced/schema work only)

Nobody on the team runs Strapi locally day-to-day; everyone points `STRAPI_URL` at the shared Strapi Cloud instance. Only spin up a local instance if you're specifically testing a content-type/schema change in isolation before it goes out. Requires PostgreSQL.

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

SI_API_BASE_URL=           # Sports Innovation API base URL
SI_ACCESS_TOKEN=           # Sports Innovation API access token

DESCOPE_PROJECT_ID=        # Descope project ID — enables login/profile pages
```

Secrets are injected as environment variables on the compute instance — never committed.

---

## Search engine indexing (preview / staging)

The site **blocks search engine crawlers by default** while in development. The public preview deployment at [strapi-website-mikzcoqln-ab1889.vercel.app](https://strapi-website-mikzcoqln-ab1889.vercel.app/) is covered by this block.

Configuration lives in `astro.config.mjs` (`env.schema.ALLOW_SEARCH_INDEXING`, default `false`).

Protection is applied in three layers:

- `/robots.txt` — `Disallow: /` for all user agents
- `<meta name="robots" content="noindex, …">` on every page
- `X-Robots-Tag: noindex, nofollow` HTTP response header

### Before production launch

1. ~~Set `ALLOW_SEARCH_INDEXING=true` in the **production** environment on Vercel~~ — done; takes effect on the next deploy to `main`
2. Redeploy and verify:
   - `GET /robots.txt` returns `Allow: /`
   - HTML pages no longer include `noindex` meta tags
   - Response headers no longer include `X-Robots-Tag: noindex`
3. Submit the production sitemap in Google Search Console when ready

Do **not** set `ALLOW_SEARCH_INDEXING=true` on preview or staging URLs.

---

## Branch workflow & deploys

1. Feature work happens on a short-lived branch, PR'd into the shared staging/preview branch (check `git branch -a` for its current name — it gets renamed periodically during the pre-launch migration, so don't hardcode it in scripts or docs).
2. The staging branch is periodically merged into `main`.
3. A push to `main` triggers automatic deploys — no manual step, no CLI login required for routine changes:
   - **Frontend → Vercel.** Builds via the `@astrojs/vercel` adapter and deploys on push.
   - **CMS → Strapi Cloud.** The `strapi/` directory (config, content-type schemas, scripts) is watched and redeployed by Strapi Cloud on push to `main`. A schema change (e.g. adding a field to a content type) typically goes live within a couple of minutes.

Health check endpoint: `GET /api/health` → `{"ok":true}`

The `Dockerfile` at the repo root is legacy from an earlier deploy target and is not part of the current pipeline.

---

## Brand

Design tokens live in `src/styles/tokens.css` and are the single source of truth for all colour and typography decisions.

| Token            | Value                        | Note                                          |
| ---------------- | ---------------------------- | --------------------------------------------- |
| `--ab-green`     | `#006A52`                    | Primary — shirts, headlines, CTAs             |
| `--ab-gold`      | `#D6A02A`                    | Pantone 131 C — accents, numerals             |
| `--ab-beige`     | `#D3BC8D`                    | Pantone 467 C — use minimally                 |
| `--ab-neon`      | `#00FF1F`                    | Pantone 802 C — **digital only**, never print |
| `--font-display` | ABC Camera Plain → Helvetica | Web license required to self-host             |

**Hard rules:**

- Never recreate the AB monogram or `1889` numeral from a typeface — always use `src/assets/brand/`
- Neon green is for on-screen accents only (focus rings, live indicators)
- Sponsor lockup: AB 1889 always primary, vertical rule separator, side-by-side only
- The owl crest and the AB monogram never appear together in a sponsor lockup
