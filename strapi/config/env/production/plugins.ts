export default () => ({
  // See config/plugins.ts: strapi-plugin-mcp exposes internal Strapi
  // functionality with Strapi's own auth disabled on its routes — allowedIPs
  // is the ONLY access control, and the policy fails OPEN (allows every IP)
  // if this list is ever emptied. Never flip enabled without also keeping
  // allowedIPs locked down to known IPs.
  mcp: {
    enabled: true,
    config: {
      allowedIPs: ['108.201.2.223', '2600:1700:97b8:12f:701e:5141:32e0:8017'],
      session: {
        type: 'memory',
      },
    },
  },
});
