import { useEffect, useRef } from 'react';

interface SiWidgetProps {
  widget: string;
  params: Record<string, string | number | undefined>;
  minHeight?: number;
  label?: string;
}

export default function SiWidget({
  widget,
  params,
  minHeight = 400,
  label,
}: SiWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

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
      iframe.src = widgetUrl;
      iframe.addEventListener(
        'load',
        () => {
          if (shimmer) shimmer.style.display = 'none';
        },
        { once: true }
      );
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            load();
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(iframe);
      return () => observer.disconnect();
    } else {
      load();
    }
  }, [widgetUrl]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: `${minHeight}px`,
        overflow: 'hidden',
      }}
    >
      {/* Green shimmer placeholder */}
      <div
        ref={shimmerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
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
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        allowFullScreen
        aria-label={label ?? widget}
        title={label ?? widget}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          minHeight: `${minHeight}px`,
          border: 0,
        }}
      />
    </div>
  );
}
