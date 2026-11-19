import { PUBLIC_POSTHOG_KEY } from 'astro:env/client';
import posthog from 'posthog-js';

let initialized = false;

/**
 * Loads PostHog product + web analytics (pageviews, autocapture, web vitals) — analytics only,
 * never session replay: disabled here via `disable_session_recording` as a client-side guard.
 * Requests are proxied same-origin through /ingest — static SDK assets via the vercel.json
 * rewrite, everything else (capture/decide/flags) via src/pages/ingest/[...path].ts (a plain
 * vercel.json rewrite to us.i.posthog.com never actually fired for those extensionless paths
 * in production) — so posthog-js never needs a third-party CSP entry and isn't caught by
 * domain-based ad blockers.
 */
export function initPostHog(): void {
  if (initialized || !PUBLIC_POSTHOG_KEY) return;
  initialized = true;
  posthog.init(PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    disable_session_recording: true,
    capture_pageview: true,
    capture_pageleave: true,
  });
  // The "AB Web" PostHog project is shared with media.ab.dk — tag every event so the two
  // properties stay distinguishable in shared dashboards/queries.
  posthog.register({ site: 'www.ab.dk' });
}

export function enablePostHogCapturing(): void {
  if (initialized) posthog.opt_in_capturing();
}

export function disablePostHogCapturing(): void {
  if (initialized) posthog.opt_out_capturing();
}
