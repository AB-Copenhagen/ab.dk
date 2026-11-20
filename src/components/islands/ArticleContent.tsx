import { BlocksRenderer } from '@strapi/blocks-react-renderer';

import { sanitizeArticleHtml } from '@/lib/sanitize';

interface Props {
  content: any;
  strapiUrl: string;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function decodeBlocks(blocks: any[]): any[] {
  return blocks.map((node) => {
    if (typeof node.text === 'string') {
      return { ...node, text: decodeHtml(node.text) };
    }
    if (Array.isArray(node.children)) {
      return { ...node, children: decodeBlocks(node.children) };
    }
    return node;
  });
}

function htmlToParapraphs(html: string): string {
  return html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/<br\s*\/?>/gi, '<br/>')}</p>`)
    .join('');
}

export default function ArticleContent({ content, strapiUrl }: Props) {
  if (!content) return null;

  // HTML string from Strapi (legacy rich text or markdown field)
  if (typeof content === 'string') {
    const decoded = decodeHtml(content);
    return (
      <div
        className="article-prose"
        dangerouslySetInnerHTML={{
          __html: sanitizeArticleHtml(htmlToParapraphs(decoded)),
        }}
      />
    );
  }

  // Strapi blocks format (array)
  const decoded = decodeBlocks(content);
  return (
    <div className="article-prose">
      <BlocksRenderer
        content={decoded}
        blocks={{
          // Editors pick a heading level in Strapi's editor without knowing
          // the page itself already renders the article title as the page's
          // one <h1> — passing the level through as-is produced multiple
          // <h1>s and out-of-order heading levels on the rendered page.
          // Shift every level down by one (capped at h6) so an editor's
          // "Heading 1" becomes this page's first subsection heading (h2),
          // keeping the hierarchy correct without editors needing to know
          // that convention.
          heading: ({ children, level }) => {
            const Tag = `h${Math.min(level + 1, 6)}` as
              'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            return <Tag>{children}</Tag>;
          },
          image: ({ image }) => (
            <img
              src={
                image.url.startsWith('http')
                  ? image.url
                  : `${strapiUrl}${image.url}`
              }
              alt={image.alternativeText || image.name || ''}
              width={image.width}
              height={image.height}
              loading="lazy"
              className="rounded-sm w-full"
            />
          ),
        }}
      />
    </div>
  );
}
