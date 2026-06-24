/**
 * AB 1889 configuration — all constants and environment-sourced values in one place.
 *
 * Import this wherever you need AB or SportsInnovation settings; never read
 * process.env directly for these values elsewhere in the codebase.
 *
 * All SI_* values are server-only. Never import this module in a Client Component
 * or prefix SI_ACCESS_TOKEN with NEXT_PUBLIC_.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

// ── SportsInnovation API ──────────────────────────────────────────────────────

export const siConfig = {
  /** Base URL for the SportsInnovation API. */
  baseUrl: optionalEnv('SI_API_BASE_URL', 'https://api.superliga.dk'),

  /**
   * API access token — server-side only.
   * Obtain from https://dash.si-ab.com/account/settings
   * Set SI_ACCESS_TOKEN in .env.local (Next.js) or the hosting platform.
   */
  get accessToken() {
    return requireEnv('SI_ACCESS_TOKEN');
  },
} as const;

// ── AB 1889 identifiers ───────────────────────────────────────────────────────

export const abConfig = {
  /** AB 1889 team ID in the SportsInnovation system. Confirmed value. */
  teamId: Number(optionalEnv('AB_TEAM_ID', '9805')),

  /**
   * 1.division tournament ID.
   * Fetch via GET /tournaments, or check dash.si-ab.com.
   * Set AB_TOURNAMENT_ID in .env.local once known.
   */
  tournamentId: optionalEnv('AB_TOURNAMENT_ID')
    ? Number(process.env.AB_TOURNAMENT_ID)
    : null,

  /**
   * Current season ID for the active 1.division season.
   * Fetch via GET /tournaments/{tournamentId}/season.
   * Set AB_SEASON_ID in .env.local once known.
   */
  seasonId: optionalEnv('AB_SEASON_ID')
    ? Number(process.env.AB_SEASON_ID)
    : null,
} as const;

// ── Descope authentication ────────────────────────────────────────────────────

export const descopeConfig = {
  /** Descope project ID — safe for both server and client. */
  projectId: requireEnv('DESCOPE_PROJECT_ID'),

  /**
   * Custom auth domain. AB 1889 uses auth.ab.dk (Descope Pro).
   * Pass as baseUrl to AuthProvider and createSdk().
   */
  baseUrl: optionalEnv('DESCOPE_BASE_URL', 'https://auth.ab.dk'),

  /**
   * Management API key — server-only.
   * Used to call the Descope Management API for user sync.
   * Never expose; never prefix NEXT_PUBLIC_.
   */
  get managementKey() {
    return requireEnv('DESCOPE_MANAGEMENT_KEY');
  },
} as const;

// ── Brand asset locations ─────────────────────────────────────────────────────

export const brandConfig = {
  /** Canva source for official AB SVG master files (monogram, crest, lockups). */
  canvaSourceUrl:
    'https://www.canva.com/design/DAG6YqmHXPI/-oLxmqHvBM5GFEWCXJBRnQ/edit',
} as const;
