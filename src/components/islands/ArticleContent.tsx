import { BlocksRenderer } from '@strapi/blocks-react-renderer';

interface Props {
  content: any;
  strapiUrl: string;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
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

export default function ArticleContent({ content, strapiUrl }: Props) {
  if (!content) return null;
  const decoded = Array.isArray(content) ? decodeBlocks(content) : content;

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <BlocksRenderer
        content={decoded}
        blocks={{
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
