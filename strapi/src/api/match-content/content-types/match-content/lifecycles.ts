/**
 * match-content lifecycles
 *
 * `articleLinks` is a repeatable component so editors can attach any number
 * of article links to a match, but `pre_match` and `post_match` are meant to
 * be single, unambiguous slots (unlike `community_news`/`other`, which are
 * allowed to repeat) — this rejects a save that would create a second one of
 * either before it reaches the database.
 *
 * `title` also gets defaulted here (from the SI event matching `eventId`)
 * whenever it's left blank — without a string field, Strapi's admin list/edit
 * views fall back to "Untitled" since there's nothing else to display. It
 * stays a normal editable field; this only fills it in when empty.
 */
import { errors } from '@strapi/utils';
import { getMatchLabel } from '../../utils/si-matches';

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

async function assignDefaultTitle(data: Record<string, unknown>) {
  if (typeof data.title === 'string' && data.title.trim().length > 0) return;
  if (typeof data.eventId !== 'number') return;

  const label = await getMatchLabel(data.eventId).catch(() => null);
  if (label) data.title = label;
}

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    assertSingleInstanceRoles(event.params.data.articleLinks);
    await assignDefaultTitle(event.params.data);
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    assertSingleInstanceRoles(event.params.data.articleLinks);
    await assignDefaultTitle(event.params.data);
  },
};
