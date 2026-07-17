// Converts Strapi Blocks rich-text JSON (or a legacy raw HTML string) into an
// HTML string, for contexts that can't use the React blocks renderer —
// e.g. server-only RSS feed generation.

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(node: any): string {
  if (typeof node.text === 'string') {
    let text = escapeHtml(node.text);
    if (node.code) text = `<code>${text}</code>`;
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.strikethrough) text = `<s>${text}</s>`;
    return text;
  }
  if (node.type === 'link') {
    const inner = (node.children ?? []).map(renderInline).join('');
    return `<a href="${escapeHtml(node.url ?? '')}">${inner}</a>`;
  }
  return '';
}

function renderBlock(node: any): string {
  const inner = (node.children ?? []).map(renderInline).join('');
  switch (node.type) {
    case 'heading':
      return `<h${node.level ?? 2}>${inner}</h${node.level ?? 2}>`;
    case 'list': {
      const tag = node.format === 'ordered' ? 'ol' : 'ul';
      const items = (node.children ?? [])
        .map(
          (li: any) =>
            `<li>${(li.children ?? []).map(renderInline).join('')}</li>`
        )
        .join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${inner}</blockquote>`;
    case 'code':
      return `<pre><code>${inner}</code></pre>`;
    case 'image':
      return node.image?.url
        ? `<img src="${escapeHtml(node.image.url)}" alt="${escapeHtml(node.image.alternativeText ?? '')}" />`
        : '';
    case 'paragraph':
    default:
      return inner ? `<p>${inner}</p>` : '';
  }
}

export function blocksToHtml(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(renderBlock).join('');
  return '';
}
