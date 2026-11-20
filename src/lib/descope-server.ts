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
