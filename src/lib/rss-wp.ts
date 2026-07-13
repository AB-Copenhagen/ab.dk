// Hand-rolled RSS 2.0 builder matching the WordPress feed format the mobile
// apps already parse (https://ab.dk/en/feed/) — same namespaces and item
// fields (dc:creator, category, guid, description, content:encoded) — so
// switching the app's feed URL to this site needs no parser changes.

export interface WpRssItem {
  title: string;
  link: string;
  creator: string;
  pubDate: Date;
  categories: string[];
  excerpt: string;
  contentHtml: string;
}

export interface WpRssChannel {
  title: string;
  link: string;
  description: string;
  feedUrl: string;
  language: string;
  items: WpRssItem[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toRfc822(date: Date): string {
  return date.toUTCString().replace('GMT', '+0000');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]&gt;')}]]>`;
}

export function buildWpRssFeed(channel: WpRssChannel): string {
  const items = channel.items
    .map((item) => {
      const categories = item.categories
        .map((cat) => `\t\t<category>${cdata(cat)}</category>`)
        .join('\n');
      return `\t<item>
\t\t<title>${escapeXml(item.title)}</title>
\t\t<link>${escapeXml(item.link)}</link>
\t\t<dc:creator>${cdata(item.creator)}</dc:creator>
\t\t<pubDate>${toRfc822(item.pubDate)}</pubDate>
${categories}
\t\t<guid isPermaLink="false">${escapeXml(item.link)}</guid>
\t\t<description>${cdata(item.excerpt)}</description>
\t\t<content:encoded>${cdata(item.contentHtml)}</content:encoded>
\t</item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
	>
<channel>
	<title>${escapeXml(channel.title)}</title>
	<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
	<link>${escapeXml(channel.link)}</link>
	<description>${escapeXml(channel.description)}</description>
	<lastBuildDate>${toRfc822(new Date())}</lastBuildDate>
	<language>${channel.language}</language>
	<sy:updatePeriod>hourly</sy:updatePeriod>
	<sy:updateFrequency>1</sy:updateFrequency>
${items}
</channel>
</rss>`;
}
