import type { Core } from '@strapi/strapi';

// Custom controller actions (unlike core CRUD actions like find/findOne)
// never get an auto-created users-permissions row, so the Public role has no
// way to be granted access to them through the schema alone — `auth: false`
// on the route only skips authentication, not this separate permission
// check, so without this the route 401s for every request no matter what.
const PUBLIC_ACTIONS = ['api::match-content.match-content.matches'];

async function ensurePublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  for (const action of PUBLIC_ACTIONS) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });
    if (existing) continue;

    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: publicRole.id },
    });
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.customFields.register({
      name: 'match-picker',
      type: 'integer',
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensurePublicPermissions(strapi).catch((err) => {
      strapi.log.error('Failed to seed public permissions for match-picker', err);
    });
  },
};
