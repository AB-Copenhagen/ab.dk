/**
 * Clamp a partner's curated logo dimensions to a per-section ceiling.
 *
 * Every partner logo is rendered at its own explicit, editor-curated
 * width/height (set in Strapi) — not auto-fit/scaled by CSS. That's
 * deliberate: a wordmark and a circular badge logo don't "fill a box" the
 * same way, and letting CSS `object-fit: contain` maximize each one inside
 * an identical box makes wide logos look artificially huge next to compact
 * ones (verified by inspecting rendered box sizes — every wide logo was
 * scaling up to fully occupy its box while square ones stayed small,
 * even though no single box ever overflowed).
 *
 * The actual bug this fixes is a handful of outlier Strapi records whose
 * curated size is out of line with their tier's peers (Ambrosia at 300x100
 * next to Unisport's 160x52, or SDS Rengøring's 160x120 growing its whole
 * card taller than its grid row's other cells). This scales such an
 * outlier down proportionally — preserving its own aspect ratio — until it
 * fits the ceiling; compliant partners pass through unchanged.
 */
export function clampLogoSize(
  width: number | null | undefined,
  height: number | null | undefined,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const w = width || maxWidth;
  const h = height || maxHeight;
  const scale = Math.min(1, maxWidth / w, maxHeight / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
