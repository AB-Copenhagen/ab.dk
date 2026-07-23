/**
 * match-content lifecycles
 *
 * `articleLinks` is a repeatable component so editors can attach any number
 * of article links to a match, but `pre_match` and `post_match` are meant to
 * be single, unambiguous slots (unlike `community_news`/`other`, which are
 * allowed to repeat) — this rejects a save that would create a second one of
 * either before it reaches the database.
 */
import { errors } from '@strapi/utils';

const SINGLE_INSTANCE_ROLES = ['pre_match', 'post_match'];

interface ArticleLinkInput {
  role?: string;
}

function assertSingleInstanceRoles(articleLinks: unknown) {
  if (!Array.isArray(articleLinks)) return;

  for (const role of SINGLE_INSTANCE_ROLES) {
    const count = articleLinks.filter(
      (link: ArticleLinkInput) => link?.role === role
    ).length;
    if (count > 1) {
      throw new errors.ApplicationError(
        `Only one "${role}" article link is allowed per match, found ${count}.`
      );
    }
  }
}

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    assertSingleInstanceRoles(event.params.data.articleLinks);
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    assertSingleInstanceRoles(event.params.data.articleLinks);
  },
};
