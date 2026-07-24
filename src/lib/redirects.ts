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
 */

const PERMANENT_STATUS = 308;

const to = (destination: string) => ({ status: PERMANENT_STATUS, destination });

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
  '/imponerende-generalproeve-broendby-if-besejret-med-3-1': to('/nyheder'),
  '/elementor-334': to('/'),
  '/category/[...path]': to('/nyheder'),
  '/author/[...path]': to('/nyheder'),

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
  '/en/impressive-dress-rehearsal-broendby-if-beaten-3-1': to('/en/news'),
  '/en/welcome-to-ab-gladsaxe': to('/en'),
  '/en/category/[...path]': to('/en/news'),
  '/en/author/[...path]': to('/en/news'),
  '/en/whats-new/[...page]': to('/en/news'),
};
