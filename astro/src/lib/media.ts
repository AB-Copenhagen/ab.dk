const WASABI_BUCKET = import.meta.env.WASABI_BUCKET ?? '';
const WASABI_REGION = import.meta.env.WASABI_REGION ?? 'eu-central-1';
const WASABI_ENDPOINT = import.meta.env.WASABI_ENDPOINT
  ?? `https://s3.${WASABI_REGION}.wasabisys.com`;

export function mediaUrl(key: string): string {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  const bucket = WASABI_BUCKET ? `${WASABI_BUCKET}/` : '';
  return `${WASABI_ENDPOINT}/${bucket}${key.replace(/^\//, '')}`;
}

export function mediaSrc(
  key: string,
  opts: { width?: number; quality?: number } = {}
): string {
  return mediaUrl(key);
}

export function isWasabiUrl(url: string): boolean {
  return url.includes('wasabisys.com');
}
