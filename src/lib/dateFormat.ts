export const AB_TIMEZONE = 'Europe/Copenhagen';

export const WEEKDAY_LONG_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
};
export const MONTH_DAY_OPTS: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
};
export const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};
export const TIME_24H_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};
export const TIME_12H_OPTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};
export const GRID_DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
};
export const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
};
export const DATE_TIME_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};
export const DATE_LONG_YEAR_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};
export const DATE_WEEKDAY_MONTH_DAY_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
};

/**
 * SSR fallback formatting. Match kickoff times are Danish local time, so the
 * server renders in Europe/Copenhagen; dateFormat.client.ts overwrites this
 * with the visitor's own timezone once it runs in the browser.
 */
export function fmtDate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = AB_TIMEZONE
): string {
  return new Date(iso).toLocaleString(locale, { ...options, timeZone });
}

/** Spread onto an element so dateFormat.client.ts can re-render it in the visitor's local timezone. */
export function dtAttrs(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  return {
    'data-dt-iso': iso,
    'data-dt-locale': locale,
    'data-dt-opts': JSON.stringify(options),
  };
}
