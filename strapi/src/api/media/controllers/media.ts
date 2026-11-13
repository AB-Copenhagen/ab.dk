/**
 * media controller
 *
 * Model-less API (no content-type) — see src/api/media/routes/media.ts.
 */
import { timingSafeEqual } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { optimizeBatch } from '../services/webp-optimize';

/** Constant-time string comparison — avoids leaking how many leading bytes of CRON_SECRET matched via response timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const BATCH_SIZE = parseInt(process.env.WEBP_BATCH_SIZE ?? '10', 10);

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // The daily schedule itself runs in-process via config/cron-tasks.ts — this
  // route is only for manually kicking off a batch on demand (e.g. testing).
  // Gated by a CRON_SECRET bearer check (set on Strapi Cloud's own env vars,
  // separate from the Vercel-hosted astro frontend) — the route itself is
  // world-reachable (see PUBLIC_ACTIONS in src/index.ts), so this check is the
  // only thing stopping anyone from triggering a batch on demand.
  async optimizeWebp(ctx: any) {
    const secret = process.env.CRON_SECRET;
    if (!secret || !safeEqual(ctx.request.headers.authorization ?? '', `Bearer ${secret}`)) {
      ctx.status = 401;
      ctx.body = 'Unauthorized';
      return;
    }

    ctx.body = await optimizeBatch(strapi, BATCH_SIZE);
  },
});
