// Returns the path without the /en prefix (added by the handler below). Article
// and blog-page differ by locale entirely (/nyheder vs /news) — /blog/* still
// exists but is only a legacy 301 redirect stub kept for old inbound links.
const getPreviewPathname = (uid, { locale, document }): string | null => {
  const { slug } = document;
  const isEnglish = locale === 'en';

  switch (uid) {
    case 'api::page.page': {
      if (slug === 'homepage') {
        return '/';
      }
      return `/${slug}`;
    }
    case 'api::product.product':
      return `/products/${slug}`;
    case 'api::product-page.product-page':
      return '/products';
    case 'api::article.article':
      return isEnglish ? `/news/${slug}` : `/nyheder/${slug}`;
    case 'api::blog-page.blog-page':
      return isEnglish ? '/news' : '/nyheder';
    default:
      return null;
  }
};

export default ({ env }) => {
  const clientUrl = env('CLIENT_URL');
  const previewSecret = env('PREVIEW_SECRET');

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    },
    preview: {
      enabled: true,
      config: {
        allowedOrigins: [clientUrl],
        async handler(uid, { documentId, locale, status }) {
          const document = await strapi
            .documents(uid)
            .findOne({ documentId, locale, status });
          const pathname = getPreviewPathname(uid, { locale, document });

          // Disable preview if the pathname is not found
          if (!pathname) {
            return null;
          }

          // Danish is the unprefixed default route (/nyheder), English is under /en
          // (/en/news) — see .cursor/rules/i18n-routing.mdc.
          const localePrefix = locale === 'en' ? '/en' : '';
          const urlSearchParams = new URLSearchParams({
            url: `${localePrefix}${pathname}`,
            secret: previewSecret,
            status,
          });

          return `${clientUrl}/api/preview?${urlSearchParams}`;
        },
      },
    },
  };
};
