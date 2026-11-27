import type { Core } from '@strapi/strapi';

// Custom controller actions (unlike core CRUD actions like find/findOne)
// never get an auto-created users-permissions row, so the Public role has no
// way to be granted access to them through the schema alone — `auth: false`
// on the route only skips authentication, not this separate permission
// check, so without this the route 401s for every request no matter what.
const PUBLIC_ACTIONS = [
  'api::match-content.match-content.matches',
  // Secret-gated inside the controller itself (CRON_SECRET bearer check) —
  // public role access here just satisfies Strapi's permission engine so an
  // unauthenticated request reaches that check at all.
  'api::media.media.optimizeWebp',
];

// Content Manager's "Entry title" (mainField) is DB-stored config, not part
// of schema.json — so it isn't version-controlled and can't be fixed via the
// Content-Type Builder UI in production (Strapi disables that UI entirely
// outside development mode). Match Content's mainField was set to
// `ticketUrl` at some point, which made every entry in its list/edit-page
// header show a URL (or blank, for entries with no ticketUrl) instead of a
// readable title — the direct cause of an entry being nearly impossible to
// find by eye in the admin. Fixing it here runs on every boot but is a
// cheap no-op once corrected.
const DISPLAY_FIELD_FIXES: Array<{ uid: string; mainField: string }> = [
  { uid: 'api::match-content.match-content', mainField: 'title' },
];

async function fixContentManagerDisplayFields(strapi: Core.Strapi) {
  const contentTypesService = strapi.plugin('content-manager').service('content-types');

  for (const { uid, mainField } of DISPLAY_FIELD_FIXES) {
    const contentType = strapi.contentTypes[uid];
    if (!contentType) continue;

    const config = await contentTypesService.findConfiguration(contentType);
    if (config.settings?.mainField === mainField) continue;

    const previous = config.settings?.mainField;
    await contentTypesService.updateConfiguration(contentType, {
      ...config,
      settings: { ...config.settings, mainField },
    });
    strapi.log.info(
      `[bootstrap] Fixed ${uid} display field: mainField was "${previous}", now "${mainField}"`
    );
  }
}

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
    await fixContentManagerDisplayFields(strapi).catch((err) => {
      strapi.log.error('Failed to fix Content Manager display fields', err);
    });
  },
};
