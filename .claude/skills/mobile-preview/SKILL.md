---
name: mobile-preview
description: Launch the ab.dk Astro dev server and screenshot a page at mobile (and desktop) viewport widths to verify responsive/Tailwind breakpoint changes. Use when asked to check mobile compatibility, review a page on mobile, or verify a `md:`/`lg:` breakpoint change actually takes effect.
---

# Mobile preview for ab.dk

This repo has no browser installed for headless screenshots out of the box, and the
local dev server can't render pages that depend on live third-party data (SI API
fixtures, Strapi CMS). This skill documents the recipe that actually works.

## 1. Start (or reuse) the dev server

Astro is pinned to **port 1889** (`astro.config.mjs` → `server.port`), not the
default 4321.

```bash
curl -sf http://localhost:1889 >/dev/null || npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:1889 >/dev/null; do sleep 1; done'
```

If a dev server is already running, `npm run dev` prints
`Dev server already running at http://localhost:1889 (pid ...)` and exits — that's
fine, just reuse it.

Expect (and ignore) `[strapi] fetchCollectionType(...) failed: ECONNREFUSED` in the
logs if local Strapi isn't running — CMS fetches are wrapped in `.catch(() => null)`
across the codebase, so pages still render with SI-only/fallback data.

## 2. Screenshot with Playwright's CLI — no install needed

Don't add `playwright` to `package.json` just to check a layout. `npx` transparently
uses whatever version is already cached (check `~/Library/Caches/ms-playwright/` and
`~/.npm/_npx/*/node_modules/playwright-core` first), and the `screenshot` subcommand
needs no driver script:

```bash
npx --yes playwright@<cached-version> screenshot \
  -b chromium --viewport-size=390,844 --full-page \
  "http://localhost:1889/en/matches" /path/to/out.png
```

- Always pass `-b chromium` explicitly. `--device "iPhone ..."` presets force
  **WebKit**, which usually isn't in the cache and triggers a full browser download
  (`npx playwright install`) — don't do that without asking first. Plain
  `--viewport-size` on chromium gives an accurate enough mobile width for
  Tailwind's `md:` (768px) breakpoint checks.
- Common widths: `375,844` / `390,844` (mobile), `768,1024` (the `md:` boundary
  itself — check just under and over it), `1280,800` (desktop).
- Then view the PNG with the Read tool.

macOS `screencapture` and the `chrome-cli`/`chromium-cli` binary on this machine
(actually a Chrome-remote-control tool, not the Playwright-based REPL some docs
assume) both require Screen Recording permission that isn't available to this
session — they will fail with `could not create image from rect/display`. Use the
Playwright CLI above instead.

## 3. Gotcha: match-detail pages need a real, live event ID

`/kamp/[slug]` and `/en/match/[slug]` fetch the match from the live SI API by
numeric event ID. A stale or made-up ID 302-redirects to `/kampe` / `/en/matches`
instead of rendering — that's the page working as intended (see
`src/pages/kamp/[slug].astro` / `src/pages/en/match/[slug].astro`), not a bug.

To preview a real match page:

1. `curl -s http://localhost:1889/kampe | grep -o '/kamp/[0-9]*'` (or the `/en/matches`
   equivalent) to find a currently-valid event ID in the live schedule, or
2. Isolate just the component you changed in a static HTML file (same Tailwind
   classes, same inline styles) and screenshot that instead — reliable when the
   live schedule has no fixture that exercises the code path you're checking.
