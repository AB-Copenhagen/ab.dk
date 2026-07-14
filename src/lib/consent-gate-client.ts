import { CONSENT_COOKIE_NAME, parseConsent, hasConsent } from '@/lib/consent';
import type { ConsentCategory, ConsentState } from '@/lib/consent';

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

export function getCurrentConsent(): ConsentState | null {
  return parseConsent(readCookie(CONSENT_COOKIE_NAME));
}

/**
 * Calls `onGranted` immediately if `category` is already consented, otherwise waits for the
 * `ab:consent-updated` event fired by the cookie banner. `onDenied` fires whenever a consent
 * decision exists (or changes) but `category` is off — use it to show/update a placeholder.
 */
export function onConsentChange(
  category: ConsentCategory,
  onGranted: () => void,
  onDenied?: () => void
): void {
  const current = getCurrentConsent();
  if (hasConsent(current, category)) {
    onGranted();
  } else if (current && onDenied) {
    onDenied();
  }

  window.addEventListener('ab:consent-updated', ((e: CustomEvent<ConsentState>) => {
    if (hasConsent(e.detail, category)) {
      onGranted();
    } else if (onDenied) {
      onDenied();
    }
  }) as EventListener);
}
