import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes legacy string-based article bodies before `dangerouslySetInnerHTML`
 * (see src/components/islands/ArticleContent.tsx). Strapi rich-text content is
 * written by trusted editors, but sanitizing defends against a compromised or
 * malicious editor account planting a stored-XSS payload that would otherwise
 * execute for every site visitor.
 */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading'],
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https'],
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        'a',
        { rel: 'noopener noreferrer' },
        true
      ),
    },
  });
}

// Mirrors vercel.json's CSP frame-src / script-src allowlist — a social embed
// snippet should only ever need an iframe or loader script from the platform
// it's actually embedding.
const EMBED_IFRAME_HOSTNAMES = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'www.instagram.com',
  'platform.twitter.com',
  'twitter.com',
  'x.com',
  'www.facebook.com',
  'www.tiktok.com',
];

const EMBED_SCRIPT_HOSTNAMES = [
  'platform.twitter.com',
  'www.instagram.com',
  'connect.facebook.net',
  'www.tiktok.com',
];

/**
 * Sanitizes CMS-authored social-embed snippets (Match Content `socialEmbeds`,
 * free-text Instagram/Twitter/YouTube/Facebook/TikTok embed codes — see
 * src/pages/kamp/[slug].astro and src/pages/en/match/[slug].astro). Any Strapi
 * editor can write this field, so it's sanitized the same as article bodies:
 * `<iframe>`/`<script>` are only kept when they point at the embed platform
 * they claim to be, everything else (including inline `<script>` with no src,
 * and `on*` handlers) is stripped.
 */
export function sanitizeEmbedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'iframe',
      'blockquote',
      'div',
      'p',
      'a',
      'span',
      'br',
      'img',
      'script',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'id', 'data-*'],
      iframe: [
        'src',
        'width',
        'height',
        'frameborder',
        'allow',
        'allowfullscreen',
        'scrolling',
        'title',
      ],
      blockquote: ['cite'],
      a: ['href', 'target', 'rel'],
      script: ['src', 'async', 'charset', 'crossorigin'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['https'],
    allowProtocolRelative: true,
    allowedIframeHostnames: EMBED_IFRAME_HOSTNAMES,
    allowedScriptHostnames: EMBED_SCRIPT_HOSTNAMES,
    // Required by sanitize-html to permit the (otherwise always-stripped)
    // `script` tag at all — safe here because allowedScriptHostnames above
    // still strips any script whose `src` isn't one of the embed platforms'
    // own loader scripts, including every inline/no-src `<script>`.
    allowVulnerableTags: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        'a',
        { rel: 'noopener noreferrer' },
        true
      ),
    },
  });
}
