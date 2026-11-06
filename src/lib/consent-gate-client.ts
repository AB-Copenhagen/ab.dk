import { CONSENT_COOKIE_NAME, hasConsent, parseConsent } from '@/lib/consent';
import type { ConsentCategory, ConsentState } from '@/lib/consent';

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

export function getCurrentConsent(): ConsentState | null {
  return parseConsent(readCookie(CONSENT_COOKIE_NAME));
}

/**
 * Calls `onGranted` immediately if `category` is already consented, otherwise calls `onDenied`
 * (if given) right away — whether that's because the visitor explicitly declined, or because no
 * consent decision has been made yet — so callers can show a placeholder instead of hanging
 * indefinitely. Either callback may fire again later via the `ab:consent-updated` event fired by
 * the cookie banner once a decision is made or changed.
 */
export function onConsentChange(
  category: ConsentCategory,
  onGranted: () => void,
  onDenied?: () => void
): void {
  const current = getCurrentConsent();
  if (hasConsent(current, category)) {
    onGranted();
  } else if (onDenied) {
    onDenied();
  }

  window.addEventListener('ab:consent-updated', ((
    e: CustomEvent<ConsentState>
  ) => {
    if (hasConsent(e.detail, category)) {
      onGranted();
    } else if (onDenied) {
      onDenied();
    }
  }) as EventListener);
}
