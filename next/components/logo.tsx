import { Link } from 'next-view-transitions';

import { BlurImage } from './blur-image';
import { resolveStrapiMedia } from '@/lib/strapi/strapiImage';
import { Image } from '@/types/types';

export const Logo = ({ image, locale }: { image?: Image; locale?: string }) => {
  const href = `/${locale || 'da'}`;

  // If Strapi has a logo image configured, use it
  if (image?.url) {
    return (
      <Link href={href} className="flex items-center gap-3 relative z-20">
        <BlurImage
          {...resolveStrapiMedia(image.url)}
          alt={image.alternativeText || 'AB 1889'}
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <ABWordmark />
      </Link>
    );
  }

  // Default: text-based AB monogram (swap for SVG once exported from Canva)
  return (
    <Link href={href} className="flex items-center gap-3 relative z-20 group">
      <ABMonogram />
      <ABWordmark />
    </Link>
  );
};

function ABMonogram() {
  return (
    <div
      className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-opacity group-hover:opacity-80"
      style={{ background: 'var(--ab-green)' }}
      aria-hidden="true"
    >
      <span
        className="text-white font-bold text-sm tracking-tight"
        style={{ letterSpacing: '-0.02em' }}
      >
        AB
      </span>
    </div>
  );
}

function ABWordmark() {
  return (
    <div className="flex flex-col leading-none">
      <span
        className="text-white font-bold text-sm uppercase tracking-widest"
        style={{ letterSpacing: '0.16em', fontSize: '0.65rem' }}
      >
        Akademisk
      </span>
      <span
        className="font-bold uppercase"
        style={{ color: 'var(--ab-gold)', letterSpacing: '0.16em', fontSize: '0.65rem' }}
      >
        Boldklub
      </span>
    </div>
  );
}
