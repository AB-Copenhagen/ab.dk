import type { Core } from '@strapi/strapi';

import { formatSearchLabel } from './api/article/content-types/article/lifecycles';

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

// Same idea as DISPLAY_FIELD_FIXES, but for a relation field's display
// *inside a component* (e.g. the `article` relation on the
// `match.article-link` component used by Match Content's `articleLinks`) —
// also DB-stored Content Manager config (`metadatas.<field>.edit/list.
// mainField`), under a separate `components` service/store namespace, same
// production-only CTB lock applies. Points the article-link relation picker
// at `searchLabel` ("YYYY-MM-DD - Title") instead of the bare, often
// similar/truncated article title.
const COMPONENT_RELATION_DISPLAY_FIELD_FIXES: Array<{
  uid: string;
  field: string;
  mainField: string;
}> = [{ uid: 'match.article-link', field: 'article', mainField: 'searchLabel' }];

async function fixComponentRelationDisplayFields(strapi: Core.Strapi) {
  const componentsService = strapi.plugin('content-manager').service('components');

  for (const { uid, field, mainField } of COMPONENT_RELATION_DISPLAY_FIELD_FIXES) {
    const component = strapi.components[uid];
    if (!component) continue;

    const config = await componentsService.findConfiguration(component);
    const fieldMeta = config.metadatas?.[field] ?? {};
    if (fieldMeta.edit?.mainField === mainField && fieldMeta.list?.mainField === mainField) {
      continue;
    }

    const previous = fieldMeta.edit?.mainField;
    await componentsService.updateConfiguration(component, {
      ...config,
      metadatas: {
        ...config.metadatas,
        [field]: {
          ...fieldMeta,
          edit: { ...fieldMeta.edit, mainField },
          list: { ...fieldMeta.list, mainField },
        },
      },
    });
    strapi.log.info(
      `[bootstrap] Fixed ${uid}.${field} relation display field: mainField was "${previous}", now "${mainField}"`
    );
  }
}

// `searchLabel` is kept current going forward by the article lifecycles
// (afterCreate/afterUpdate), but that only fires on new saves — existing
// rows need a one-time backfill, same "schema defaults don't retroactively
// backfill existing rows" limitation documented elsewhere in this app.
// Cheap no-op pass once every row is caught up.
async function backfillArticleSearchLabels(strapi: Core.Strapi) {
  const articles = (await strapi.db.query('api::article.article').findMany({
    select: ['id', 'title', 'originalPublishedAt', 'searchLabel'],
  })) as Array<{
    id: number;
    title: unknown;
    originalPublishedAt: unknown;
    searchLabel: unknown;
  }>;

  for (const article of articles) {
    const label = formatSearchLabel(article.title, article.originalPublishedAt);
    if (!label || label === article.searchLabel) continue;

    await strapi.db.query('api::article.article').update({
      where: { id: article.id },
      data: { searchLabel: label },
    });
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
    await fixComponentRelationDisplayFields(strapi).catch((err) => {
      strapi.log.error('Failed to fix component relation display fields', err);
    });
    await backfillArticleSearchLabels(strapi).catch((err) => {
      strapi.log.error('Failed to backfill article search labels', err);
    });
  },
};
