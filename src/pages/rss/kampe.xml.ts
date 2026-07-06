import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { fetchABEvents } from '@/lib/si/client';

export async function GET(context: APIContext) {
  const site = context.site?.toString() ?? context.url.origin;

  // Fetch recent results + upcoming fixtures (90-day window)
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 60);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);

  const events = await fetchABEvents({
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    limit: 40,
    locale: 'da',
  }).catch(() => []);

  return rss({
    title: 'AB 1889 · Kampe',
    description: 'Resultater og kommende kampe for Akademisk Boldklub',
    site,
    items: events.map((event) => {
      const scoreStr = event.score ? ` ${event.score}` : '';
      const title = `${event.homeName}${scoreStr} vs ${event.awayName}`;
      const matchDate = new Date(event.startDate);
      return {
        title,
        description: `${event.tournamentName} · ${event.statusFull ?? event.statusType}`,
        pubDate: matchDate,
        link: `/kamp/${event.eventId}`,
      };
    }),
    customData: '<language>da-DK</language>',
  });
}
