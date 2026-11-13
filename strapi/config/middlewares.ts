export default ({ env }: { env: (key: string, defaultValue?: string) => string | undefined }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', '*.wasabisys.com'],
          'media-src': ["'self'", 'data:', 'blob:', '*.wasabisys.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Strapi's default is `origin: '*'` with `credentials: true`, which
      // reflects whatever Origin header the caller sends while still allowing
      // credentialed requests — any website can then read cookie-authenticated
      // responses cross-site. Pin it to the actual ab.dk frontend(s) instead.
      // CORS_ORIGINS supports a comma-separated list for any extra preview/
      // staging domain; CLIENT_URL alone covers the normal single-frontend case.
      origin: (env('CORS_ORIGINS') ?? env('CLIENT_URL', 'http://localhost:3000') ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
