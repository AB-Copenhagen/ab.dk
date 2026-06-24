export default ({ env }: { env: (key: string, fallback?: string) => string }) => ({
  email: {
    config: {
      provider: 'mailgun',
      providerOptions: {
        key: env('MAILGUN_API_KEY'),
        domain: env('MAILGUN_DOMAIN'),
        // Use EU region endpoint if your Mailgun account is EU-based
        url: env('MAILGUN_HOST', 'https://api.mailgun.net'),
      },
      settings: {
        defaultFrom: env('MAILGUN_FROM', 'noreply@ab.dk'),
        defaultReplyTo: env('MAILGUN_REPLY_TO', 'kontakt@ab.dk'),
      },
    },
  },
  translate: {
    enabled: true,
    config: {
      provider: 'deepl',
      providerOptions: {
        apiKey: env('DEEPL_API_KEY'),
        // Free-tier uses api-free.deepl.com; set DEEPL_API_FREE=false for paid plans
        apiUrl:
          env('DEEPL_API_FREE', 'true') === 'true'
            ? 'https://api-free.deepl.com'
            : 'https://api.deepl.com',
      },
      translationsToIgnore: ['uid'],
      contentTypes: [
        'api::article.article',
        'api::page.page',
        'api::global.global',
        'api::blog-page.blog-page',
      ],
    },
  },
});
