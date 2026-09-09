export type PartnerTier = 'supreme' | 'premium' | 'local-hero' | 'ab1889';

export const TIER_LABELS: Record<PartnerTier, { da: string; en: string }> = {
  supreme: { da: 'Supreme Partner', en: 'Supreme Partner' },
  premium: { da: 'Premium Partner', en: 'Premium Partner' },
  'local-hero': { da: 'Local Hero Partner', en: 'Local Hero Partner' },
  ab1889: { da: 'AB 1889 Partner', en: 'AB 1889 Partner' },
};
