/**
 * Shared font-sizing logic for the squad/staff photo cards (SquadCard.astro,
 * StaffCard.astro). Both cards pin a name + label above a large number/initials
 * block inside a fixed aspect-ratio frame — a long name (many words, or a single
 * long unbreakable word like "Benediktsson") or a wrapping two-word label (e.g.
 * "Head Coach") can together take up enough vertical space to push the number
 * block past the bottom of the card. Scale name and number size down together
 * as that risk grows, rather than letting either overflow.
 *
 * Only the clamp's minimum (mobile, narrow-card) end varies with severity — the
 * max stays the same as the original design at every tier, so wide desktop cards
 * always render at full size regardless of name length (there's room to spare).
 */

export interface PersonCardSizing {
  nameFontClamp: string;
  numberFontClamp: string;
  labelFontClamp: string;
}

const NAME_MIN_REM = [0.95, 0.8, 0.7, 0.6];
const NAME_VW = '2.1vw';
const NAME_MAX_REM = 1.75;

const NUMBER_MIN_REM = [2.5, 2.1, 1.8, 1.5];
const NUMBER_VW = '6.5vw';
const NUMBER_MAX_REM = 6.5;

const MAX_SEVERITY = NAME_MIN_REM.length - 1;

// A long single-word label (e.g. "Physiotherapist") doesn't wrap, but at the
// standard text-xs size it renders visually oversized/dominant on a narrow mobile
// card. Shrink it based on its own longest word, independent of the name sizing.
const LABEL_MIN_REM: [number, number][] = [
  [12, 0.52],
  [8, 0.6],
  [0, 0.68],
];
const LABEL_VW = '1.5vw';
const LABEL_MAX_REM = 0.75;

function getLabelFontClamp(labelText: string): string {
  const longestLabelWord = Math.max(
    0,
    ...labelText
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.length)
  );
  const tier = LABEL_MIN_REM.find(
    ([minLength]) => longestLabelWord > minLength
  );
  const min = tier?.[1] ?? LABEL_MIN_REM[LABEL_MIN_REM.length - 1][1];
  return `clamp(${min}rem,${LABEL_VW},${LABEL_MAX_REM}rem)`;
}

export function getPersonCardSizing(
  fullName: string,
  labelText = ''
): PersonCardSizing {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const longestWord = Math.max(0, ...nameParts.map((part) => part.length));

  let severity = 0;
  if (longestWord > 10) severity = 3;
  else if (longestWord > 8) severity = 2;
  else if (longestWord > 6) severity = 1;

  // 3+ name parts (first + middle + last, or a 2-word surname) risk wrapping to
  // 3 lines even when each individual word is short.
  if (nameParts.length >= 3) severity = Math.max(severity, 2);

  // A label with its own wrapping risk (e.g. "Head Coach") adds one more line.
  const labelWordCount = labelText.trim().split(/\s+/).filter(Boolean).length;
  if (labelWordCount >= 2) severity = Math.min(MAX_SEVERITY, severity + 1);

  return {
    nameFontClamp: `clamp(${NAME_MIN_REM[severity]}rem,${NAME_VW},${NAME_MAX_REM}rem)`,
    numberFontClamp: `clamp(${NUMBER_MIN_REM[severity]}rem,${NUMBER_VW},${NUMBER_MAX_REM}rem)`,
    labelFontClamp: getLabelFontClamp(labelText),
  };
}
