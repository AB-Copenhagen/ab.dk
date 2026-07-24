/**
 * Legacy WordPress -> new-site redirects (see redirect-plan.md for the full audit).
 *
 * PERMANENT 308s — the mappings below were validated post-launch (every
 * destination confirmed to resolve to a real page) and are now stable, so this
 * passes on SEO equity to the new URLs. 308 (not 301) preserves the request
 * method, which matters for the WooCommerce-era POST destinations like
 * `/kasse` and `/cart` -> `https://shop.ab.dk`.
 *
 * The old bare-post-slug wildcard (`/:slug` -> `/nyheder/:slug`) from the plan is
 * deliberately NOT here: it's the same route shape as [slug].astro itself (both
 * single dynamic segments), so Astro can't prioritize one over the other — that
 * fallback is instead handled inside [slug].astro/en/[slug].astro when no CMS
 * page matches.
 *
 * Two entries stay TEMPORARY (302) instead: the "⚠" page-vs-post cases from
 * redirect-plan.md, where it's unconfirmed a matching Strapi article exists at
 * all. They land on the generic listing page either way, so nothing 404s, but
 * a 302 avoids telling search engines this mapping is final until that's checked.
 */

const PERMANENT_STATUS = 308;
const TEMPORARY_STATUS = 302;

const to = (destination: string) => ({ status: PERMANENT_STATUS, destination });
const toTemp = (destination: string) => ({
  status: TEMPORARY_STATUS,
  destination,
});

export const legacyRedirects = {
  // ── Danish ──────────────────────────────────────────────────────────────
  '/historie': to('/om/historik'),
  '/gladsaxe-stadion': to('/om/stadion'),
  // '/kontakt' needs no entry — the WP source path and the new site's path
  // are now identical.
  '/sponsorer': to('/partnere'),
  '/bliv-sponsor': to('/partnere'),
  '/truppen': to('/hold'),
  '/kampprogram': to('/kampe'),
  '/resultater': to('/kampe'),
  '/stillingen': to('/kampe'),
  '/persondatapolitik': to('/privatlivspolitik'),
  '/refund_returns': to('/returpolitik'),
  '/selskabslokaler': to('/hospitality'),
  '/fanzone': to('/kampdag'),
  '/kalender': to('/events'),
  '/forespoergsel-om-begivenhed': to('/hospitality'),
  '/spillernyheder': to('/nyheder'),
  '/kamprapporter': to('/nyheder'),
  '/myab/live-stream': to('/myab'),
  '/myab/info': to('/myab'),
  '/myab/register': to('/myab'),
  '/myab/profile': to('/konto/profil'),
  '/watch': to('/abtv'),
  '/sizzle': to('/abtv'),
  '/kontrolrapport': to('/om/stadion'),
  '/kasse': to('https://shop.ab.dk'),
  '/cart': to('https://shop.ab.dk'),
  '/current-jobs': to('/'),
  '/referral': to('/'),
  '/newsletter': to('/'),
  '/thank-you': to('/'),
  '/delete-profile': to('/konto/profil'),
  '/ab-squad-stories-frederik-lindgaard': to('/abtv'),
  '/imponerende-generalproeve-broendby-if-besejret-med-3-1': toTemp('/nyheder'),
  '/elementor-334': to('/'),
  '/category/[...path]': to('/nyheder'),
  '/author/[...path]': to('/nyheder'),
  '/tag/[...path]': toTemp('/nyheder'),
  '/spiller': toTemp('/hold'),
  // Nested legacy WP paths (old taxonomy/category hierarchy).
  //
  // IMPORTANT: a wildcard (`[...path]`) source must NEVER redirect to a
  // destination that shares its own prefix — `/nyheder/[...path] -> /nyheder`
  // caused a production outage (infinite self-redirect: Vercel's wildcard
  // matching apparently also matches zero extra segments, so a bare request
  // to /nyheder matched its own rule and redirected to itself, forever). Same
  // bug hit /en/news/[...path] -> /en/news. Both are gone for good — there is
  // no safe way to redirect a prefix's *own* nested sub-paths back to itself
  // this way. The old /nyheder/mit-ab-historierne/* posts are accepted as
  // 404s rather than risk this a third time.
  //
  // A wildcard source can also break the build if pointed at a statically
  // prerendered destination (om/stadion, om/ledelse, faellesskab, and
  // partnere all are) — confirmed via an actual `npm run build` failure:
  // "getStaticPaths() function is required for dynamic routes", thrown
  // against the *destination* page. Exact-match sources (no wildcard) don't
  // have this problem — /gladsaxe-stadion and /kontrolrapport below already
  // redirect to the static /om/stadion just fine.
  '/kategori/[...path]': toTemp('/nyheder'), // Danish WP category-base variant of /category
  '/produkt-kategori/[...path]': toTemp('/products'),
  '/2-division/organisation': toTemp('/om/ledelse'), // exact match, static destination is fine here
  '/fanzone/[...path]': toTemp('/kampdag'),
  '/match/[...path]': toTemp('/kampe'), // old WP team-name-slug match pages, no ID mapping possible
  '/ab-tv': toTemp('/abtv'),
  // These would ideally land on /partnere, /faellesskab, and /om/ledelse
  // respectively, but all three are statically prerendered — see the note
  // above. Homepage is a safe, non-misleading fallback instead.
  '/partnere/[...path]': toTemp('/'),
  '/klubfaellesskabet/[...path]': toTemp('/'),
  '/nordicbet-liga/organisation/[...path]': toTemp('/'),
  // "Klubben" (the club) WP section — no clear 1:1 new-site destination for
  // its FAQ/admin/wall-of-fame sub-pages either, same homepage fallback.
  '/klubben/[...path]': toTemp('/'),

  // ── English ─────────────────────────────────────────────────────────────
  '/en/history': to('/en/about/history'),
  '/en/gladsaxe-stadium': to('/en/about/stadium'),
  '/en/contact-us': to('/en/contact'),
  '/en/sponsors': to('/en/partners'),
  '/en/become-a-sponsor': to('/en/partners'),
  '/en/the-troops': to('/en/squad'),
  '/en/whats-new': to('/en/news'),
  '/en/match-day': to('/en/matchday'),
  '/en/match-program': to('/en/matches'),
  '/en/the-results': to('/en/matches'),
  '/en/2nd-division-standings': to('/en/matches'),
  '/en/fan-zone': to('/en/matchday'),
  '/en/calendar': to('/en/events'),
  '/en/book-events': to('/en/hospitality'),
  '/en/event-inquiry': to('/en/hospitality'),
  '/en/player-news': to('/en/news'),
  '/en/match-reports': to('/en/news'),
  '/en/myab/login': to('/en/myab'),
  '/en/myab/register': to('/en/myab'),
  '/en/myab/info': to('/en/myab'),
  '/en/myab/competitions': to('/en/myab'),
  '/en/myab/exclusive-content': to('/en/myab'),
  '/en/myab/game-highlights': to('/en/myab'),
  '/en/myab/password-reset': to('/en/myab'),
  '/en/myab/member-live-stream': to('/en/myab'),
  '/en/myab/profile': to('/en/account/profile'),
  '/en/my-account': to('/en/account/profile'),
  '/en/auth-login': to('/en/account'),
  '/en/auth-success': to('/en/account'),
  '/en/oauth-login': to('/en/account'),
  '/en/fan-party-stream': to('/en/abtv'),
  '/en/ab-sizzle': to('/en/abtv'),
  '/en/control-report': to('/en/about/stadium'),
  '/en/shop': to('https://shop.ab.dk'),
  '/en/current-jobs': to('/en'),
  '/en/referral': to('/en'),
  '/en/ab-newsletter': to('/en'),
  '/en/delete-profile': to('/en/account/profile'),
  '/en/ab-squad-stories-frederik-lindgaard': to('/en/abtv'),
  '/en/impressive-dress-rehearsal-broendby-if-beaten-3-1': toTemp('/en/news'),
  '/en/welcome-to-ab-gladsaxe': to('/en'),
  '/en/category/[...path]': to('/en/news'),
  '/en/author/[...path]': to('/en/news'),
  '/en/whats-new/[...page]': to('/en/news'),
  '/en/tag/[...path]': toTemp('/en/news'),
  // Would ideally be /en/partners, but that page is statically prerendered —
  // see the Danish section's note on wildcard sources + static destinations.
  '/en/partners/[...path]': toTemp('/en'),
  '/en/history-of-our-products': toTemp('/en/products'),
};
