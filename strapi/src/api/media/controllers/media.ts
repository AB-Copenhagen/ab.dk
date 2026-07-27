/**
 * media controller
 *
 * Model-less API (no content-type) — see src/api/media/routes/media.ts.
 */
import type { Core } from '@strapi/strapi';
import { optimizeBatch } from '../services/webp-optimize';

const BATCH_SIZE = parseInt(process.env.WEBP_BATCH_SIZE ?? '10', 10);

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Triggered daily by the Vercel Cron entry in vercel.json. Same
  // `Authorization: Bearer $CRON_SECRET` scheme as the astro app's
  // /api/cron/sitemap — the route itself is world-reachable (see
  // PUBLIC_ACTIONS in src/index.ts), so this check is the only thing
  // stopping anyone from triggering a batch on demand.
  async optimizeWebp(ctx: any) {
    const secret = process.env.CRON_SECRET;
    if (!secret || ctx.request.headers.authorization !== `Bearer ${secret}`) {
      ctx.status = 401;
      ctx.body = 'Unauthorized';
      return;
    }

    ctx.body = await optimizeBatch(strapi, BATCH_SIZE);
  },
});
