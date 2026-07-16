# Redirect Plan — legacy ab.dk (WordPress) → new site (Astro)

Cutting the domain over without redirects will break every bookmark, backlink, and search
result pointing at the old WordPress site. This documents what needs a 301 redirect, to
what, and how to implement it. No redirects exist in the codebase yet (`vercel.json` isn't
present, `astro.config.mjs` has no `redirects` block).

## Recommended implementation

Use **`vercel.json`** `redirects` (evaluated at the edge, before any Astro function runs —
cheaper and simpler than an in-app catch-all). Order matters: Vercel checks rules top to
bottom and stops at the first match, so list every **exact** legacy page first, then a
**wildcard catch-all** last for news posts (anything not already matched).

```json
{
  "redirects": [
    { "source": "/historie", "destination": "/om/historik", "permanent": true },
    { "source": "/en/history", "destination": "/en/about/history", "permanent": true },
    // ... all exact-match rows from the tables below ...
    { "source": "/:slug", "destination": "/nyheder/:slug", "permanent": true },
    { "source": "/en/:slug", "destination": "/en/news/:slug", "permanent": true }
  ]
}
```

Trailing slashes: WP URLs are all trailing-slash (`/historie/`); Vercel's `source` matches
with or without it by default, so no special-casing needed.

---

## 1. Exact static-page redirects

### Danish (37 WP pages checked → 1:1 new-site match found for most)

| Old (ab.dk) | New | Notes |
| --- | --- | --- |
| `/historie/` | `/om/historik` | |
| `/gladsaxe-stadion/` | `/om/stadion` | |
| `/kontakt/` | `/om/kontakt` | |
| `/sponsorer/`, `/bliv-sponsor/` | `/partnere` | two old slugs, one new page |
| `/truppen/` | `/hold` | |
| `/nyheder/` | `/nyheder` | already matches |
| `/kampdag/` | `/kampdag` | already matches |
| `/kampprogram/`, `/resultater/`, `/stillingen/` | `/kampe` | program, results, and standings consolidated into one Matches page |
| `/persondatapolitik/` | `/om/privatlivspolitik` | |
| `/refund_returns/` | `/om/returpolitik` | |
| `/selskabslokaler/` | `/hospitality` | |
| `/fanzone/` | `/kampdag` | fan-zone info folded into matchday page |
| `/kalender/` | `/events` | |
| `/forespoergsel-om-begivenhed/` | `/hospitality` | event-inquiry form is now inline on Hospitality |
| `/spillernyheder/`, `/kamprapporter/` (category archives) | `/nyheder` | no per-category filter on new site yet |
| `/myab/`, `/myab/live-stream/`, `/myab/info/`, `/myab/register/` | `/myab` | MyAB subpages consolidated |
| `/myab/profile/` | `/konto/profil` | |
| `/watch/`, `/sizzle/` | `/abtv` | |
| `/kontrolrapport/` | `/om/stadion` | food-safety "control report" — no dedicated slot yet, park under Stadium |
| `/kasse/`, `/cart/` | `https://shop.ab.dk` | WooCommerce checkout — shop now lives on the separate Shopify domain |
| `/current-jobs/`, `/referral/`, `/newsletter/`, `/thank-you/` | `/` | no equivalent page; send to homepage |
| `/delete-profile/` | `/konto/profil` | |
| `/ab-squad-stories-frederik-lindgaard/` | `/abtv` | one-off WP page, not a real post |
| `/imponerende-generalproeve-broendby-if-besejret-med-3-1/` | `/nyheder` | ⚠ this is WP page-type content, not a post — verify it has (or gets) a real article before cutover, else this redirect just lands on the general list |
| `/elementor-334/` | `/` | homepage builder artifact |

### English (44 WP pages checked)

| Old (ab.dk) | New | Notes |
| --- | --- | --- |
| `/en/history/` | `/en/about/history` | |
| `/en/gladsaxe-stadium/` | `/en/about/stadium` | |
| `/en/contact-us/` | `/en/contact` | |
| `/en/sponsors/`, `/en/become-a-sponsor/` | `/en/partners` | |
| `/en/the-troops/` | `/en/squad` | |
| `/en/whats-new/` | `/en/news` | |
| `/en/match-day/` | `/en/matchday` | |
| `/en/match-program/`, `/en/the-results/`, `/en/2nd-division-standings/` | `/en/matches` | ⚠ "2nd Division" — confirms the doc's league-tier label predates a promotion; live site now says "1st Division" (see `content-gap-audit.md`, Homepage section) |
| `/en/privacy-policy/` | `/en/privacy-policy` | already matches |
| `/en/refund-and-returns-policy/` | `/en/refund-and-returns-policy` | already matches |
| `/en/fan-zone/` | `/en/matchday` | |
| `/en/calendar/` | `/en/events` | |
| `/en/book-events/`, `/en/event-inquiry/` | `/en/hospitality` | |
| `/en/player-news/`, `/en/match-reports/` (category archives) | `/en/news` | |
| `/en/myab/`, `/en/myab/login/`, `/en/myab/register/`, `/en/myab/info/`, `/en/myab/competitions/`, `/en/myab/exclusive-content/`, `/en/myab/game-highlights/`, `/en/myab/password-reset/`, `/en/myab/member-live-stream/` | `/en/myab` | old WP/MyAB auth+content subpages, superseded by Descope + this page |
| `/en/myab/profile/`, `/en/my-account/` | `/en/account/profile` | |
| `/en/auth-login/`, `/en/auth-success/`, `/en/oauth-login/` | `/en/account` | legacy WP auth flow, superseded by Descope |
| `/en/fan-party-stream/`, `/en/ab-sizzle/` | `/en/abtv` | |
| `/en/control-report/` | `/en/about/stadium` | |
| `/en/shop/` | `https://shop.ab.dk` | |
| `/en/current-jobs/`, `/en/referral/`, `/en/ab-newsletter/` | `/en` | no equivalent; homepage |
| `/en/delete-profile/` | `/en/account/profile` | |
| `/en/ab-squad-stories-frederik-lindgaard/` | `/en/abtv` | |
| `/en/impressive-dress-rehearsal-broendby-if-beaten-3-1/` | `/en/news` | ⚠ same page-vs-post caveat as the DA equivalent above |
| `/en/welcome-to-ab-gladsaxe/` | `/en` | homepage |

---

## 2. News articles (pattern rule, not a per-post table)

WP posts use flat permalinks — `/{slug}/` (da) and `/en/{slug}/` (en) — with **661** total
published posts. The new site nests them under `/nyheder/{slug}` and `/en/news/{slug}`.
Since the slug itself carries over unchanged (confirmed against the Strapi import), one
wildcard rule per locale covers all of them, **as long as it's placed after every exact
match in section 1** (pages and posts share the same flat URL namespace on the old site).

```
/:slug      → /nyheder/:slug
/en/:slug   → /en/news/:slug
```

**Before cutover:** confirm Strapi actually has an article for every slug this rule will hit,
or the redirect just trades a WP 404 for a new-site 404. As of this session, **9 recent
English posts are confirmed missing from Strapi** (see the news catch-up work — blocked on
a Strapi API token with write access) and their Danish counterparts haven't been checked.
Run `strapi/scripts/catchup-wp.mjs` for both locales before relying on this rule.

## 3. Everything else

| Old pattern | New destination | Why |
| --- | --- | --- |
| `/category/*`, `/en/category/*`, `/author/*`, `/en/author/*` | `/nyheder`, `/en/news` | no category/author archive pages on the new site |
| `/en/whats-new/2/`, `/3/`, ... (pagination) | `/en/news` | new listing has no numbered pagination yet |
| `/?s=...`, `/en/?s=...` (WP search) | `/`, `/en` | search is now a client-side modal (`SearchModal.tsx`), not a URL |
| `/feed/`, `/en/feed/`, `/comments/feed/` | — | **already compatible** — `src/pages/feed.ts` and `src/pages/en/feed.ts` serve the same paths on the new site. No redirect needed, just confirm output format parity. |
| `/robots.txt`, `/sitemap.xml` (WP) | — | **already compatible** — `src/pages/robots.txt.ts` and `src/pages/sitemap.xml.ts` serve the same paths |
| `/wp-admin/*`, `/wp-login.php`, `/wp-json/*`, `/xmlrpc.php` | 404 (no redirect) | internal WP machinery with no new-site equivalent; don't dignify with a redirect target |
| `/wp-content/uploads/*` (inline post images, PDFs) | *unresolved — see below* | |

### Media assets — separate decision needed

Every WP post/page image referenced via `wp-content/uploads/...` currently gets served
straight from WordPress. This plan only covers **page** redirects; it does not move or
redirect the underlying image files. Options:
1. Keep the old WP host (or just its `/wp-content/uploads/` path) alive indefinitely as a
   static asset server behind the new domain.
2. Best-effort redirect image URLs to their migrated Wasabi equivalents — not 1:1, since
   Strapi re-hosts and re-names images during import.
3. Accept broken inline images on any external page/search result that hotlinks the old
   URL directly (most inbound links target the *page*, not the image, so this is lower-risk
   than it sounds, but do confirm before accepting it).

This needs an explicit call from whoever owns the WP hosting/DNS — flagging it here so it
doesn't get missed during cutover, not resolving it.

---

## Open items before cutover

1. Get a Strapi **Full Access** API token and run the catch-up import (blocked mid-session
   on a read-only token) — otherwise the news wildcard redirect sends 9+ known posts to 404.
2. Decide the two "⚠" page-vs-post cases in section 1 (match-report content stored as a WP
   *page* rather than a *post* — confirm whether it exists as a Strapi article at all).
3. Sitemap.xml currently caps at 100 articles/locale (no pagination loop) — fix before
   relying on it post-cutover for re-indexing.
4. Decide the media-asset question above.
5. Danish page-list was pulled from `/wp-json/wp/v2/pages`; it does **not** include
   category/tag archive slugs or the full post list — this plan assumes the pattern rule in
   section 2 covers those, but do a spot-check against Google Search Console's indexed-URL
   list before cutover to catch anything this audit missed.
