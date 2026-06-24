export default ({ env }: { env: (key: string, fallback?: string) => string }) => ({
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
