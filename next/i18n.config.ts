export const i18n = {
  defaultLocale: 'da',
  locales: ['da', 'en'],
} as const;

export type Locale = (typeof i18n)['locales'][number];
