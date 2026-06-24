import { LinkProps } from 'next/link';

import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'simple' | 'outline' | 'primary' | 'muted';
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
  href?: LinkProps['href'];
  onClick?: () => void;
  [key: string]: any;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  as: Tag = 'button',
  className,
  children,
  ...props
}) => {
  const variantClass =
    variant === 'primary'
      ? 'bg-ab-green hover:bg-ab-green/90 border border-ab-green text-white'
      : variant === 'outline'
        ? 'bg-transparent hover:bg-ab-green/10 border border-ab-green text-ab-green hover:text-white'
        : variant === 'simple'
          ? 'bg-transparent hover:bg-white/5 border border-white/20 text-white'
          : variant === 'muted'
            ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/70'
            : '';

  const Element = Tag as any;

  return (
    <Element
      className={cn(
        'relative z-10 text-sm font-bold uppercase tracking-widest px-5 py-2.5 transition-all duration-200 flex items-center justify-center hover:-translate-y-px active:translate-y-0',
        variantClass,
        className
      )}
      style={{ letterSpacing: '0.1em' }}
      {...props}
      suppressHydrationWarning
    >
      {children ?? 'Kom i gang'}
    </Element>
  );
};
