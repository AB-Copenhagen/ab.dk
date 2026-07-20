export default ({ env }: { env: (key: string, fallback?: string) => string }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        rootPath: 'uploads',
        s3Options: {
          credentials: {
            accessKeyId: env('WASABI_ACCESS_KEY_ID'),
            secretAccessKey: env('WASABI_SECRET_ACCESS_KEY'),
          },
          region: env('WASABI_REGION', 'eu-central-1'),
          endpoint: env('WASABI_ENDPOINT', 'https://s3.eu-central-1.wasabisys.com'),
          params: {
            Bucket: env('WASABI_BUCKET'),
            ACL: 'private',
            signedUrlExpires: parseInt(env('WASABI_SIGNED_URL_EXPIRES', '604800')),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
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
  // Dev-only: exposes Strapi content types/services over MCP for AI assistants.
  // Explicitly disabled in config/env/production/plugins.ts — never enable in production.
  mcp: {
    enabled: true,
    config: {
      session: {
        type: 'memory',
      },
    },
  },
});
