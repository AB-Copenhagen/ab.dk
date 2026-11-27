export default () => ({
  // See config/plugins.ts: strapi-plugin-mcp exposes internal Strapi
  // functionality with Strapi's own auth disabled on its routes — allowedIPs
  // is the ONLY access control, and the policy fails OPEN (allows every IP)
  // if this list is ever emptied. Never flip enabled without also keeping
  // allowedIPs locked down to known IPs.
  mcp: {
    enabled: true,
    config: {
      allowedIPs: ['147.185.158.143'],
      session: {
        type: 'memory',
      },
    },
  },
});
