// Danish is this site's default locale and is served with no URL prefix
// (e.g. /kampe); English is served under /en (e.g. /en/kampe).
const getPreviewPathname = (uid, { locale, document }): string | null => {
  const { slug } = document;
  const localePrefix = locale === 'en' ? '/en' : '';

  switch (uid) {
    case 'api::page.page': {
      if (slug === 'homepage') {
        return locale === 'en' ? '/en' : '/';
      }
      return `${localePrefix}/${slug}`;
    }
    case 'api::product.product':
      return `${localePrefix}/products/${slug}`;
    case 'api::product-page.product-page':
      return `${localePrefix}/products`;
    case 'api::article.article':
      return locale === 'en' ? `/en/news/${slug}` : `/nyheder/${slug}`;
    case 'api::blog-page.blog-page':
      return locale === 'en' ? '/en/news' : '/nyheder';
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

          const urlSearchParams = new URLSearchParams({
            url: pathname,
            secret: previewSecret,
            status,
          });

          return `${clientUrl}/api/preview?${urlSearchParams}`;
        },
      },
    },
  };
};
