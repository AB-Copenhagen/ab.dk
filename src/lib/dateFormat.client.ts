/**
 * Re-formats server-rendered match/event date-times using the visitor's own
 * browser timezone. The server has no way to know the visitor's timezone, so
 * SSR renders a Europe/Copenhagen fallback (see dateFormat.ts) and this runs
 * client-side to correct it — omitting `timeZone` lets Intl default to the
 * browser's local zone.
 */
export function localizeDates(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-dt-iso]').forEach((el) => {
    const { dtIso, dtLocale, dtOpts } = el.dataset;
    if (!dtIso || !dtLocale || !dtOpts) return;
    try {
      const options = JSON.parse(dtOpts) as Intl.DateTimeFormatOptions;
      el.textContent = new Date(dtIso).toLocaleString(dtLocale, options);
    } catch {
      // keep server-rendered Europe/Copenhagen fallback
    }
  });
}
