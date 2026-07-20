export default () => ({
  // See config/plugins.ts: strapi-plugin-mcp exposes internal Strapi
  // functionality and must never be enabled in production.
  mcp: {
    enabled: false,
  },
});
