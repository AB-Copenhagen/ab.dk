/**
 * match-content controller
 */
import { factories } from '@strapi/strapi';
import { listCurrentSeasonMatches } from '../utils/si-matches';

export default factories.createCoreController(
  'api::match-content.match-content',
  () => ({
    /** Admin-only: lists the current season's matches for the match-picker custom field. */
    async matches(ctx) {
      ctx.body = await listCurrentSeasonMatches();
    },
  })
);
