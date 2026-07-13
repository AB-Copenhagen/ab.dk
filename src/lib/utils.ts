/** Decode HTML entities from Strapi content (&#8211;, &amp;, etc.) */
export function decodeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export const truncate = (text: string | null | undefined, length: number) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Escape HTML special characters before interpolating untrusted input into an HTML string. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
