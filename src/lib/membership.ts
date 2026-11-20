/**
 * MyAB membership tiers. EventBilletten is the billing source of truth; its
 * webhook (src/pages/api/eventbilletten-webhook.ts) mirrors the current tier
 * into Descope's `currentTier` custom attribute, which rides in the session
 * JWT (see the "Default OIDC compliant User JWT" template) — so gating reads
 * it straight off the session with no extra API call per request.
 */
export const MEMBERSHIP_TIERS = ['free', 'plus', 'premium'] as const;

export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];

/** Session claims that don't match a known tier (missing, stale, or 'null' from an unset Descope attribute) default to 'free' rather than failing closed on every page view. */
export function normalizeTier(
  value: string | undefined | null
): MembershipTier {
  return (MEMBERSHIP_TIERS as readonly string[]).includes(value ?? '')
    ? (value as MembershipTier)
    : 'free';
}

/** True when `tier` meets or exceeds `required` (free < plus < premium). */
export function hasTier(
  tier: string | undefined | null,
  required: MembershipTier
): boolean {
  return (
    MEMBERSHIP_TIERS.indexOf(normalizeTier(tier)) >=
    MEMBERSHIP_TIERS.indexOf(required)
  );
}
