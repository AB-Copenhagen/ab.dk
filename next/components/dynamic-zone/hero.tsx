'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { Button } from '../elements/button';

export const Hero = ({
  heading,
  sub_heading,
  CTAs,
  locale,
}: {
  heading: string;
  sub_heading: string;
  CTAs: any[];
  locale: string;
}) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: 'var(--rich-black)' }}
    >
      {/* Subtle green grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,106,82,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,106,82,0.04) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Year badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 flex items-center gap-3"
      >
        <div className="h-px w-8" style={{ background: 'var(--ab-gold)' }} />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--ab-gold)', letterSpacing: '0.2em' }}
        >
          Akademisk Boldklub · 1889
        </span>
        <div className="h-px w-8" style={{ background: 'var(--ab-gold)' }} />
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 text-center font-bold uppercase text-white max-w-5xl mx-auto"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 6rem)',
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
        }}
      >
        {heading || 'Akademisk\nBoldklub'}
      </motion.h1>

      {/* AB Green rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative z-10 my-7 w-16 h-0.5"
        style={{ background: 'var(--ab-green)' }}
      />

      {/* Sub-heading */}
      {sub_heading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-10 text-center max-w-xl mx-auto text-sm leading-relaxed mb-10"
          style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}
        >
          {sub_heading}
        </motion.p>
      )}

      {/* CTAs */}
      {CTAs?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="relative z-10 flex flex-wrap gap-3 items-center justify-center"
        >
          {CTAs.map((cta, i) => (
            <Button
              key={cta?.id ?? i}
              as={Link}
              href={`/${locale}${cta.URL}`}
              variant={i === 0 ? 'primary' : 'outline'}
            >
              {cta.text}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--rich-black), transparent)' }}
      />
    </div>
  );
};
