import { BlocksRenderer } from '@strapi/blocks-react-renderer';

interface Props {
  content: any;
  strapiUrl: string;
}

export default function ArticleContent({ content, strapiUrl }: Props) {
  if (!content) return null;

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <BlocksRenderer
        content={content}
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
