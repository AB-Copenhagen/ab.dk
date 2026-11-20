import descopeSdk from '@descope/node-sdk';

const descopeProjectId = import.meta.env.DESCOPE_PROJECT_ID;
// Only needed for Management API calls (e.g. the EventBilletten webhook looking up
// a user by their custom attribute and patching `currentTier`) — session
// validation/refresh works without it.
const descopeManagementKey = import.meta.env.DESCOPE_MANAGEMENT_KEY;

export const descope = descopeProjectId
  ? descopeSdk({
      projectId: descopeProjectId,
      managementKey: descopeManagementKey,
    })
  : null;

const ONE_DAY_SECONDS = 60 * 60 * 24;

// The session JWT itself is short-lived (Descope mints it for minutes, not
// days) — this cookie ceiling is just an outer bound. `DSR` (the refresh
// token) is what actually keeps a visitor signed in across that JWT expiring;
// middleware uses it to silently mint a new session JWT via
// `validateAndRefreshSession` rather than forcing a fresh login.
export const SESSION_COOKIE_MAX_AGE = ONE_DAY_SECONDS * 7;
export const REFRESH_COOKIE_MAX_AGE = ONE_DAY_SECONDS * 30;

/** Shared cookie attributes for the DS/DSR pair — kept in one place so both stay in sync. */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds,
  };
}

export interface DescopeUserProfile {
  name?: string;
  givenName?: string;
  middleName?: string;
  familyName?: string;
  createdAt?: Date;
}

/**
 * One Management API lookup for profile fields the session JWT doesn't carry
 * (first/last/full name, account creation time) — the session JWT only ever
 * has `sub` plus whatever custom claims a JWT Template adds, and this repo's
 * template doesn't surface name fields today. Call this once per page that
 * needs them (e.g. the MyAB dashboard greeting), not on every request.
 */
export async function loadUserProfile(
  userId: string
): Promise<DescopeUserProfile> {
  if (!descope) return {};

  const { data, ok, error } = await descope.management.user
    .loadByUserId(userId)
    .catch((err) => ({ data: undefined, ok: false, error: err }));
  if (!data) {
    // Logged (not swallowed) — a missing/invalid DESCOPE_MANAGEMENT_KEY fails
    // exactly like this (ok: false, no thrown error) and otherwise degrades
    // silently to the "Fan" greeting fallback with no trace in the logs.
    if (!ok) console.error('[descope] loadUserProfile failed', error);
    return {};
  }

  const { createdTime } = data;
  const createdAt =
    typeof createdTime === 'number'
      ? // Descope's createdTime is in Unix seconds; guard against a future ms-based value anyway.
        new Date(createdTime > 1e12 ? createdTime : createdTime * 1000)
      : undefined;

  return {
    name: data.name,
    givenName: data.givenName,
    middleName: data.middleName,
    familyName: data.familyName,
    createdAt,
  };
}
