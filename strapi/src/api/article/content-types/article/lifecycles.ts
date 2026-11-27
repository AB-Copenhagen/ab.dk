/**
 * article lifecycles
 *
 * Strapi stamps `publishedAt` with real record-creation time on this
 * instance no matter what a create/update payload sends — confirmed via the
 * WordPress migration scripts, which need the *true* original publish date
 * preserved separately. `originalPublishedAt` is the source of truth for
 * sorting/display; this hook defaults it so it's never left null for
 * entries created without an explicit value (e.g. from the Strapi admin).
 *
 * `searchLabel` ("YYYY-MM-DD - Title") exists purely so the Match Content
 * article-link relation picker has something more identifiable than a bare,
 * often-truncated title to search and display — see `src/index.ts`, which
 * points that relation's Content Manager display field at it. It's always
 * recomputed from the saved row (never hand-edited), so this uses
 * afterCreate/afterUpdate against `event.result` (the full merged entity)
 * rather than beforeCreate/beforeUpdate's `data`, which on an update only
 * carries the fields actually being changed — computing from a partial
 * payload would blank the label whenever an edit didn't touch title/date.
 * The write-back uses the low-level `strapi.db.query` layer, which doesn't
 * re-trigger these lifecycles, so there's no recursion risk.
 */
export function formatSearchLabel(title: unknown, originalPublishedAt: unknown): string | undefined {
  if (typeof title !== 'string' || !title.trim()) return undefined;

  const date = originalPublishedAt ? new Date(originalPublishedAt as string) : null;
  const dateStr = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  return dateStr ? `${dateStr} - ${title}` : title;
}

async function syncSearchLabel(result: Record<string, unknown>) {
  const label = formatSearchLabel(result.title, result.originalPublishedAt);
  if (!label || label === result.searchLabel) return;

  await strapi.db.query('api::article.article').update({
    where: { id: result.id },
    data: { searchLabel: label },
  });
}

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (!data.originalPublishedAt) {
      data.originalPublishedAt = data.publishedAt ?? new Date().toISOString();
    }
  },
  async afterCreate(event: { result: Record<string, unknown> }) {
    await syncSearchLabel(event.result);
  },
  async afterUpdate(event: { result: Record<string, unknown> }) {
    await syncSearchLabel(event.result);
  },
};
