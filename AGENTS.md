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

## Managing player overrides (Strapi)

SI (the third-party sports data API) is the source for squad/player data, but it goes
stale in ways only Strapi can fix now: wrong photos (old kit/season), stale shirt
numbers/positions, or a player who should be hidden from the squad entirely. The
**Player** content type (`api::player.player`) is where these overrides live, joined to
SI by `siPlayerId` (also works for manual/not-yet-in-SI players — see
`src/data/manual-players.ts` — via their synthetic negative ID).

**Precedence for every overridable field**: a real Strapi row → the legacy static
fallback in `src/data/player-cms-data.ts` (`PLAYER_CMS_DATA`, being phased out) → the
raw SI value. Nothing breaks for a player who doesn't have a Strapi row yet.

**To populate/override a player entry in Strapi admin → Content Manager → Player:**

| Field                 | Description                                                                    | Example                          |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `siPlayerId`          | SI API player ID (from `/spiller/{id}-{slug}` URL)                             | `658977`                         |
| `nickname`            | Short name or nickname                                                         | `"Adri"`                         |
| `formerClubs`         | Comma-separated previous clubs                                                 | `"FC Augsburg II, SGV Freiberg"` |
| `bio` (da + en)       | 2–3 paragraph player biography                                                 | —                                |
| `quote` (da + en)     | One memorable player quote, no surrounding quotes                              | —                                |
| `gallery`             | Action photos — first image shown full-width, next 3 in grid                   | —                                |
| `photo`               | Current headshot, overrides the automatic Wasabi/SI-CDN photo                  | —                                |
| `photoPosition`       | CSS crop anchor for `photo`: `left-bottom` / `center-bottom` / `right-bottom`  | —                                |
| `hidePhoto`           | Hide the photo entirely (e.g. no current photo exists yet)                     | `true`                           |
| `hideFromSquad`       | Remove the player from the squad list/homepage entirely                        | `true` for a departed player     |
| `displayNameOverride` | Corrects a truncated/ASCII-mangled SI name                                     | `"Søren Ilsøe"`                  |
| `shirtNumberOverride` | Corrects a stale SI shirt number                                               | `3`                              |
| `positionOverride`    | Corrects a stale/wrong SI position: `keeper`/`defender`/`midfielder`/`forward` | —                                |

A one-off script (`scripts/seed-player-overrides.mjs`) migrated the overrides previously
hardcoded in `src/data/player-cms-data.ts` and `src/lib/si/player-photos.ts` into Strapi.
New overrides going forward are entered directly in Strapi admin.

> Restart Strapi after editing the schema (new fields included) so it picks up the change.

## Managing staff (Strapi)

The **Staff** content type (`api::staff.staff`, REST plural `staff-members`) is localized
(da/en). Non-localized fields (`slug`, `photo`, `photoPosition`, `sortOrder`, `hidePhoto`,
`hidden`) are shared across locales automatically — only `role`, `nationality`, and `bio`
need separate DA/EN text.

**Important:** Strapi requires a separate row per locale for a staffer to appear in that
locale's page/listing at all — this applies even to non-localized fields. When creating a
new staff member, after saving the first locale, use Strapi admin's **"Fill in from
another locale"** action to create the other locale's row before publishing both.

**Per-record fallback**: any staffer without a Strapi row (or one you haven't migrated
yet) still renders from the hardcoded `COACHING_STAFF` array in
`src/data/coaching-staff.ts` — unlike partners/hero-slides, this file is kept
indefinitely as a permanent safety net, not trimmed after migration.

| Field           | Localized | Description                                                          |
| --------------- | :-------: | -------------------------------------------------------------------- |
| `slug`          |    no     | URL segment, e.g. `/stab/{slug}` and `/en/staff/{slug}`              |
| `name`          |    no     | Full name                                                            |
| `role`          |    yes    | Job title, e.g. "Cheftræner" / "Head Coach"                          |
| `nationality`   |    yes    | e.g. "Svensk, Finsk" / "Swedish, Finnish"                            |
| `photo`         |    no     | Headshot — upload directly in Strapi Media Library                   |
| `photoPosition` |    no     | CSS crop anchor: `left-bottom` / `center-bottom` / `right-bottom`    |
| `hidePhoto`     |    no     | Hide the photo entirely (e.g. no current photo exists yet)           |
| `hidden`        |    no     | Remove the staffer from the roster/detail page without deleting them |
| `sortOrder`     |    no     | Ascending display order                                              |
| `bio`           |    yes    | Detail-page biography                                                |

A one-off script (`scripts/seed-staff-members.mjs`) migrated the roster previously
hardcoded in `src/data/coaching-staff.ts` into Strapi, except `photo` — the existing
photos are Wasabi proxy URLs, not local files, so editors re-upload each staffer's photo
into Strapi's Media Library once, by hand. New staff going forward are entered directly
in Strapi admin.

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

## Managing the homepage hero slider (Strapi)

The **Hero Slide** content type (`api::hero-slide.hero-slide`) drives the homepage hero
slider. `image` is shared across locales (same photo for da/en, like Partner `logo`);
`video` is localized since the da/en clips have different narration/text baked in.

| Field        | Localized | Description                                                      |
| ------------ | :-------: | ---------------------------------------------------------------- |
| `name`       |    no     | Admin-only label — not shown on the site                         |
| `slideType`  |    no     | `image` or `video` — picks which fields render                   |
| `sortOrder`  |    no     | Ascending slide order                                            |
| `image`      |    no     | Used when `slideType = image`                                    |
| `video`      |    yes    | Used when `slideType = video` — upload separate da/en clips      |
| `headline`   |    yes    | Image slides only                                                |
| `subtitle`   |    yes    | Image slides only, optional                                      |
| `ctaLabel`   |    yes    | Button text                                                      |
| `ctaUrl`     |    yes    | Full URL/path — internal links differ by locale (e.g. `/en/...`) |
| `ctaVariant` |    no     | `btn-beige` / `btn-green` / `btn-dark`                           |
| `alt`        |    yes    | Image slide alt text                                             |

Whether a CTA opens in a new tab is derived automatically from `ctaUrl` (external `http(s)`
links open in a new tab; internal paths don't) — there's no separate field for it.

**Next-home matchup slide**: the first homepage slide is built in code from the next SI home
fixture, not from a Strapi slide. Its background photo resolves as: that match's Match
Content `bannerImage` → the `image` of a published Hero Slide with `slideType = matchup`
(the editable site-wide default; only `image` is read, create one row per locale) → the
bundled `hero-next-home.jpg`.

If the `hero-slides` collection has no published entries (e.g. before seeding, or Strapi
unreachable), the homepage falls back to a hardcoded set of slides in `Homepage.astro`
rather than showing a blank hero section.

A one-off script (`scripts/seed-hero-slides.mjs`) migrated the 4 slides previously
hardcoded in `Homepage.astro` into Strapi. New slides going forward are entered directly
in Strapi admin.

> Restart Strapi after the first deploy so it picks up the new content type.

## Managing match content (Strapi)

The **Match Content** content type (`api::match-content.match-content`) holds CMS-only
extras for a specific SI fixture (identified by `eventId`, entered via a custom
match-search picker) — it doesn't duplicate anything SI already provides (score, kickoff
time, opponent, etc.).

| Field          | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `eventId`      | SI event ID — search-and-select via the custom match picker, not typed manually  |
| `title`        | Admin-only label — not shown on the site                                         |
| `ticketUrl`    | Overrides the auto-derived billet.ab.dk ticket link for this match               |
| `accentColor`  | Optional accent color for the match detail page                                  |
| `bannerImage`  | Hero photo for the match detail page                                             |
| `articleLinks` | Repeatable — tags an Article by role (see below)                                 |
| `socialEmbeds` | Repeatable — `platform` (Instagram/Twitter/YouTube/Facebook/TikTok) + embed code |

`articleLinks` is how pre-match previews, post-match reports, and similar are attached to
a fixture: each entry pairs a `role` (`pre_match` / `post_match` / `community_news` /
`away_travel` / `other`) with a relation to an **Article**.

**Picking the right locale in that Article relation search:** Strapi's relation picker
shows titles in whichever locale the admin is currently viewing — and because Match
Content itself isn't a localized content type, that ambient locale defaults to Danish
regardless of which article you're actually looking for. If your Article titles are
easier to find in English, switch Strapi's locale selector to English _before_ opening
the Match Content entry (rather than after) — the article-link search will then show
English titles instead. There's no per-field locale toggle inside the picker itself.

## Managing away-game venues (Strapi)

The **Venue** content type (`api::venue.venue`) supplies the opponent's stadium name and
address for away fixtures, used in the `SportsEvent.location` structured data (JSON-LD) on
match detail pages (`src/pages/kamp/[slug].astro`, `src/pages/en/match/[slug].astro` via
`matchLocationSchema()` in `src/lib/structured-data.ts`). Not localized — a stadium's
name/address doesn't vary by site language. AB's own home ground (for home fixtures) is
hardcoded in that same helper, not stored in Strapi.

| Field             | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `name`            | Stadium name, e.g. `"Right to Dream Park"`                                   |
| `opponentTeamId`  | The opponent's SI team ID (from `event.homeId` on a fixture where they host) |
| `streetAddress`   | Street address                                                               |
| `addressLocality` | City/town                                                                    |
| `postalCode`      | Postal code                                                                  |
| `addressCountry`  | ISO country code, defaults to `"DK"`                                         |
| `isNeutralVenue`  | Set for a neutral-ground fixture (e.g. a cup final) — informational only     |

**Without a Venue row for an opponent**, the match page falls back to that opponent's team
name (not a street address) for `location.name`, and a country-only `PostalAddress` for
`location.address` — valid but low-detail structured data, not a validation error. Add a
row before an away fixture (or once Google Search Console flags one) to fill in the real
address.

> Restart Strapi after the first deploy so it picks up the new content type, and grant the
> Public role `find`/`findOne` permissions for Venue in Strapi admin (Settings → Users &
> Permissions → Roles → Public) — new content types aren't auto-granted public read access.

## Managing ABTV videos (Strapi)

The **ABTV Video** content type (`api::abtv-video.abtv-video`) drives `/abtv` and
`/en/abtv`'s video grid. Not localized — captions are plain `captionDa`/`captionEn`
fields on a single row, not separate per-locale entries, since most captions (show names,
English documentary titles) are identical across both languages anyway; fill in both
fields with the same text when no real translation is needed.

| Field          | Description                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `captionDa`    | Caption shown above the embed on the Danish page                                                     |
| `captionEn`    | Caption shown above the embed on the English page                                                    |
| `youtubeId`    | The 11-char video ID, or the playlist ID when `isPlaylist` is set                                    |
| `isPlaylist`   | Whether `youtubeId` is a playlist ID (`embed/videoseries?list=...`) vs a single video (`embed/{id}`) |
| `section`      | Which page section it appears in: `trending` / `season` / `behind_the_scenes`                        |
| `requiredTier` | Membership tier needed to watch: `free` / `plus` / `premium` — defaults to `free`                    |
| `uploadDate`   | Approximate publish date, feeds the video's `VideoObject.uploadDate`                                 |
| `sortOrder`    | Ascending display order within its section                                                           |
| `hidden`       | Remove the video from the page without deleting it                                                   |

**Gating is real, not cosmetic, only for content that isn't already public elsewhere.**
All 8 videos migrated from the old hardcoded page are public YouTube channel content, so
they're seeded as `requiredTier: free` — setting a public video's tier above `free` would
just hide something anyone can already find on YouTube. Reserve `plus`/`premium` for
videos that are genuinely unlisted/exclusive. A gated video's real `youtubeId`/embed URL
is never rendered into the page's HTML for a visitor who doesn't meet the tier (see
`src/components/abtv/VideoCard.astro`) — only a static thumbnail and an upgrade CTA are,
and it's excluded from the page's `ItemList`/`VideoObject` structured data so it's never
advertised as a URL an anonymous crawler could actually fetch.

A one-off script (`scripts/seed-abtv-videos.mjs`) migrated the videos previously
hardcoded in `src/pages/abtv.astro` into Strapi. New videos going forward are entered
directly in Strapi admin.

> Restart Strapi after the first deploy so it picks up the new content type, and grant the
> Public role `find`/`findOne` permissions for ABTV Video in Strapi admin (Settings → Users
> & Permissions → Roles → Public) — new content types aren't auto-granted public read access.

## Managing popups (Strapi)

The **Popup** content type (`api::popup.popup`) drives a sitewide modal for specials,
offers, and featured content — mounted once in `src/layouts/Base.astro`, so it can appear
over any page. Localized (da/en) like Hero Slide: non-localized fields (scheduling,
targeting, frequency, image, `ctaVariant`) are shared across locales automatically — only
`headline`, `body`, `ctaLabel`, and `ctaUrl` need separate DA/EN text.

| Field               | Localized | Description                                                                                                      |
| ------------------- | :-------: | ---------------------------------------------------------------------------------------------------------------- |
| `name`              |    no     | Admin-only label — not shown on the site                                                                         |
| `isActive`          |    no     | Manual on/off switch — turn off instead of deleting to pause a popup                                             |
| `startDate`         |    no     | Optional — popup is eligible only from this date onward                                                          |
| `endDate`           |    no     | Optional — popup stops being eligible after this date                                                            |
| `pagePaths`         |    no     | Comma-separated path prefixes (e.g. `/,/en` for the homepage only, both locales). Empty = eligible on every page |
| `displayFrequency`  |    no     | How often a visitor sees it once shown: `once_per_session` / `once_per_day` / `once_per_n_days` / `every_visit`  |
| `frequencyDays`     |    no     | Only used when `displayFrequency = once_per_n_days`                                                              |
| `sortOrder`         |    no     | When more than one popup matches a page/date, the lowest `sortOrder` wins — only one is ever shown at a time     |
| `image`             |    no     | Optional banner image at the top of the popup                                                                    |
| `headline`          |    yes    |                                                                                                                  |
| `body`              |    yes    | Short supporting text, optional                                                                                  |
| `ctaLabel`/`ctaUrl` |    yes    | Button text/link — omit either to render the popup with no CTA button                                            |
| `ctaVariant`        |    no     | `btn-beige` / `btn-green` / `btn-dark`, same styling as Hero Slide CTAs                                          |

**Dismissal/frequency is cookie-based** (`ab_popup_seen_<documentId>`), following the same
pattern as `CookieConsentBanner.astro` — no server-side "has this visitor seen it" check,
since most pages are statically prerendered and have no per-request cookies to read. The
cookie is stamped at impression time (as soon as it's shown), not only when explicitly
closed, so a visitor who ignores it and navigates away doesn't see it again within the
same frequency window either. There's no content-type-level enforcement of "only one
active popup per page" — if two overlapping popups both match, only the lower-`sortOrder`
one renders, so editors should toggle `isActive` off on the one they don't want showing
rather than relying on validation to catch it.

New popups are entered directly in Strapi admin — there's no legacy hardcoded popup to
migrate, so no seed script.

> Restart Strapi after the first deploy so it picks up the new content type, and grant the
> Public role `find`/`findOne` permissions for Popup in Strapi admin (Settings → Users &
> Permissions → Roles → Public) — new content types aren't auto-granted public read access.
