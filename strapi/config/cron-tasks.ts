import { optimizeBatch } from '../src/api/media/services/webp-optimize';

const BATCH_SIZE = parseInt(process.env.WEBP_BATCH_SIZE ?? '10', 10);

// Strapi Cloud runs this as a persistent process (unlike the Vercel-hosted
// astro frontend), so Strapi's native cron — not an externally-triggered
// HTTP route — is the right fit: it just runs in-process on schedule.
export default {
  '0 4 * * *': async ({ strapi }: { strapi: any }) => {
    const result = await optimizeBatch(strapi, BATCH_SIZE);
    strapi.log.info(
      `[webp-optimize] scanned=${result.scanned} converted=${result.converted} failed=${result.failed}`
    );
    if (result.errors.length) {
      strapi.log.error(`[webp-optimize] ${result.errors.join('; ')}`);
    }
  },
};
