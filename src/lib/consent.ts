export const CONSENT_COOKIE_NAME = 'ab_consent';
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentCategory = 'functional' | 'statistics' | 'marketing';

export interface ConsentState {
  necessary: true;
  functional: boolean;
  statistics: boolean;
  marketing: boolean;
  ts: number;
}

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  functional: false,
  statistics: false,
  marketing: false,
  ts: 0,
};

/** Parse a raw (URI-encoded JSON) cookie value into a ConsentState. Returns null if absent/invalid. */
export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      necessary: true,
      functional: Boolean(parsed.functional),
      statistics: Boolean(parsed.statistics),
      marketing: Boolean(parsed.marketing),
      ts: typeof parsed.ts === 'number' ? parsed.ts : 0,
    };
  } catch {
    return null;
  }
}

export function hasConsent(
  state: ConsentState | null,
  category: ConsentCategory
): boolean {
  return state?.[category] === true;
}
