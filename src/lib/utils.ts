export const truncate = (text: string | null | undefined, length: number) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
