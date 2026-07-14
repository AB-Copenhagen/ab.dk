import { useEffect, useRef, useState } from 'react';
import { onConsentChange } from '@/lib/consent-gate-client';

interface SiWidgetProps {
  widget: string;
  params: Record<string, string | number | undefined>;
  minHeight?: number;
  label?: string;
  locale?: 'da' | 'en';
}

const t = {
  da: {
    message: 'Denne widget kræver samtykke til funktionelle cookies.',
    enable: 'Aktiver',
  },
  en: {
    message: 'This widget requires consent for functional cookies.',
    enable: 'Enable',
  },
};

export default function SiWidget({
  widget,
  params,
  minHeight = 400,
  label,
  locale = 'da',
}: SiWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const copy = t[locale];

  // Build widget URL (no width param — handled by CSS)
  const qs = new URLSearchParams();
  qs.set('nopadding', 'true');
  qs.set('transparent', 'true');
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && String(val) !== '') {
      qs.set(key, String(val));
    }
  }
  const widgetUrl = `https://dash.si-ab.com/widgets/${widget}?${qs.toString()}`;

  useEffect(() => {
    const iframe = iframeRef.current;
    const shimmer = shimmerRef.current;
    if (!iframe) return;

    function load() {
      if (!iframe || iframe.src) return;
      setNeedsConsent(false);
      iframe.src = widgetUrl;
      iframe.addEventListener(
        'load',
        () => {
          if (shimmer) shimmer.style.display = 'none';
        },
        { once: true }
      );
    }

    function showConsentNeeded() {
      if (iframe?.src) return;
      if (shimmer) shimmer.style.display = 'none';
      setNeedsConsent(true);
    }

    function whenVisible(callback: () => void) {
      if (typeof IntersectionObserver !== 'undefined' && iframe) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              callback();
              observer.disconnect();
            }
          },
          { rootMargin: '200px' }
        );
        observer.observe(iframe);
        return () => observer.disconnect();
      }
      callback();
      return undefined;
    }

    return whenVisible(() => {
      onConsentChange('functional', load, showConsentNeeded);
    });
  }, [widgetUrl]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: `${minHeight}px` }}
    >
      {/* Green shimmer placeholder */}
      <div
        ref={shimmerRef}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg,#0D1A10 25%,#122718 50%,#0D1A10 75%)',
          backgroundSize: '200% 100%',
          animation: 'siShimmer 1.6s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes siShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {needsConsent && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center"
          style={{ background: '#0D1A10' }}
        >
          <p className="text-white/60 text-xs max-w-[32ch]">{copy.message}</p>
          <button
            type="button"
            className="font-black text-xs px-4 py-2 bg-ab-green text-white tracking-[-0.01em] hover:opacity-90 transition-opacity"
            onClick={() =>
              (
                window as unknown as { abOpenCookieSettings?: () => void }
              ).abOpenCookieSettings?.()
            }
          >
            {copy.enable}
          </button>
        </div>
      )}
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        allowFullScreen
        aria-label={label ?? widget}
        title={label ?? widget}
        className="relative z-[1] block border-0"
        style={{ minHeight: `${minHeight}px` }}
      />
    </div>
  );
}
