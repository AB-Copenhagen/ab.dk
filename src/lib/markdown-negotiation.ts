import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Chrome that isn't page content — never wanted in a markdown rendering,
// regardless of which page it appears on.
turndownService.remove(['script', 'style', 'noscript', 'template']);
turndownService.addRule('stripSvgAndChrome', {
  filter: (node) =>
    node.nodeName === 'SVG' ||
    node.nodeName === 'NAV' ||
    (node.nodeName === 'FOOTER' && node.parentElement?.tagName !== 'TABLE'),
  replacement: () => '',
});

/**
 * True when the request's `Accept` header expresses a genuine preference for
 * `text/markdown` over `text/html` — i.e. an agent explicitly asking for the
 * markdown variant, not a browser sending a permissive wildcard Accept header.
 */
export function prefersMarkdown(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false;

  const entries = acceptHeader.split(',').map((part) => {
    const [rawType, ...params] = part.trim().split(';');
    const type = rawType?.trim().toLowerCase() ?? '';
    const qParam = params.find((p) => p.trim().startsWith('q='));
    const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
    return { type, q: Number.isNaN(q) ? 1 : q };
  });

  const markdown = entries.find(
    (e) => e.type === 'text/markdown' || e.type === 'text/x-markdown'
  );
  if (!markdown) return false;

  const html = entries.find((e) => e.type === 'text/html' || e.type === '*/*');
  if (!html) return true;

  return markdown.q >= html.q;
}

/**
 * Converts a full rendered HTML page into a markdown document — the page's
 * <title> becomes the top-level heading (falls back to the first <h1> if
 * present), <main> is preferred over the full <body> when present so nav/
 * footer chrome doesn't dominate the output, and script/style/nav/footer
 * elements are dropped so the result is just the page's actual content.
 */
export function htmlPageToMarkdown(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const contentHtml = mainMatch?.[1] ?? bodyMatch?.[1] ?? html;

  const body = turndownService.turndown(contentHtml).trim();
  const hasH1 = /^#\s+/m.test(body);

  return title && !hasH1 ? `# ${title}\n\n${body}` : body;
}
