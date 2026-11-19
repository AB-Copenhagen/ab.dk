import posthog from 'posthog-js';
import { PUBLIC_POSTHOG_KEY } from 'astro:env/client';

let initialized = false;

/**
 * Loads PostHog product + web analytics (pageviews, autocapture, web vitals) — analytics only,
 * never session replay: disabled here via `disable_session_recording` AND at the PostHog project
 * level (`session_recording_opt_in: false`), as a second guard. Requests are proxied through
 * /ingest (see vercel.json) so posthog-js stays same-origin — no CSP script-src/connect-src entry
 * needed, and no ad-blocker interference.
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
