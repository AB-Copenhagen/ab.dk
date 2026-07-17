/**
 * article lifecycles
 *
 * Strapi stamps `publishedAt` with real record-creation time on this
 * instance no matter what a create/update payload sends — confirmed via the
 * WordPress migration scripts, which need the *true* original publish date
 * preserved separately. `originalPublishedAt` is the source of truth for
 * sorting/display; this hook defaults it so it's never left null for
 * entries created without an explicit value (e.g. from the Strapi admin).
 */
export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (!data.originalPublishedAt) {
      data.originalPublishedAt = data.publishedAt ?? new Date().toISOString();
    }
  },
};
