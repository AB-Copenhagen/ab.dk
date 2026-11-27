export default () => ({
  // See config/plugins.ts: strapi-plugin-mcp exposes internal Strapi
  // functionality with Strapi's own auth disabled on its routes — allowedIPs
  // is the ONLY access control, and the policy fails OPEN (allows every IP)
  // if this list is ever emptied. Never flip enabled without also keeping
  // allowedIPs locked down to known IPs.
  mcp: {
    enabled: true,
    config: {
      allowedIPs: [
        '108.201.2.223',
        '2600:1700:97b8:12f:701e:5141:32e0:8017',
        '172.56.163.52',
        '2607:fb91:3085:cfa3:29bc:44fc:3f69:454d',
      ],
      session: {
        type: 'memory',
      },
    },
  },
});
