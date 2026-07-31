import { useCallback, useEffect, useRef, useState } from 'react';

interface Result {
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  imageUrl: string | null;
}

interface Props {
  locale: string;
}

export default function SearchModal({ locale }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  // Position of the trigger button at click-time, so the panel can drop down
  // right next to it instead of appearing pinned near the top of the
  // viewport, disconnected from wherever the button actually is on the page
  // (e.g. the news category row, which can be far below the fold).
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blogBase = locale === 'en' ? '/en/news' : '/nyheder';

  const openModal = useCallback((rect?: DOMRect) => {
    setAnchorRect(rect ?? null);
    setOpen(true);
    setQuery('');
    setResults([]);
    setActive(-1);
  }, []);
  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActive(-1);
  }, []);

  // Wire external button + Cmd/Ctrl+K
  useEffect(() => {
    const btn = document.getElementById('search-open-btn');
    const onBtnClick = () => openModal(btn?.getBoundingClientRect());
    if (btn) btn.addEventListener('click', onBtnClick);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? closeModal() : openModal();
      }
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      if (btn) btn.removeEventListener('click', onBtnClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, openModal, closeModal]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&locale=${locale}`
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query, locale]);

  // Keyboard navigation through results
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    }
    if (e.key === 'Enter' && active >= 0) {
      window.location.href = `${blogBase}/${results[active].slug}`;
    }
  };

  if (!open) return null;

  // Anchored under the trigger button when we have its position (regular
  // click); falls back to the old centered-near-top placement for the
  // Cmd/Ctrl+K shortcut, which has no button to anchor to.
  const width = Math.min(560, window.innerWidth - 32);
  const panelStyle: React.CSSProperties = anchorRect
    ? (() => {
        const gap = 10;
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const openUpward = spaceBelow < 340 && anchorRect.top > spaceBelow;
        return {
          position: 'fixed',
          width,
          right: Math.max(16, window.innerWidth - anchorRect.right),
          ...(openUpward
            ? { bottom: window.innerHeight - anchorRect.top + gap }
            : { top: anchorRect.bottom + gap }),
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        };
      })()
    : {
        position: 'fixed',
        width,
        left: '50%',
        transform: 'translateX(-50%)',
        top: 'clamp(60px,12vh,140px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      };

  return (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="bg-white rounded-[12px] overflow-hidden border border-[#E5E7EB]"
        style={panelStyle}
      >
        {/* Input row */}
        <div className="flex items-center gap-[12px] py-[16px] px-[20px] border-b border-[#E5E7EB]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="shrink-0 text-[#888]"
          >
            <circle
              cx="8"
              cy="8"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M13 13l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder={
              locale === 'da' ? 'Søg efter nyheder…' : 'Search news…'
            }
            className="flex-1 border-none outline-none text-[1rem] font-semibold text-[#111] bg-transparent font-[inherit]"
          />
          {loading && (
            <div
              className="w-[16px] h-[16px] rounded-full shrink-0"
              style={{
                border: '2px solid #E5E7EB',
                borderTopColor: 'var(--ab-green)',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}
          <button
            onClick={closeModal}
            className="bg-none border border-[#E5E7EB] rounded-[6px] py-[2px] px-[8px] text-[0.7rem] text-[#888] cursor-pointer shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="list-none m-0 py-[8px] px-0 max-h-[400px] overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.slug}>
                <a
                  href={`${blogBase}/${r.slug}`}
                  className="flex items-center gap-[14px] py-[10px] px-[20px] no-underline transition-[background] duration-150"
                  style={{
                    background: i === active ? '#F0F9F5' : 'transparent',
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt=""
                      className="w-[52px] h-[40px] object-cover rounded-[4px] shrink-0"
                    />
                  ) : (
                    <div className="w-[52px] h-[40px] bg-[#F3F4F6] rounded-[4px] shrink-0 flex items-center justify-center">
                      <span
                        className="text-[1.1rem] font-black"
                        style={{
                          color:
                            'color-mix(in srgb, var(--ab-green) 20%, transparent)',
                        }}
                      >
                        AB
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    {r.category && (
                      <p className="text-[0.68rem] font-bold text-ab-green m-0 mb-[2px] tracking-[0.04em]">
                        {r.category}
                      </p>
                    )}
                    <p className="text-[0.9rem] font-bold text-[#111] m-0 whitespace-nowrap overflow-hidden text-ellipsis">
                      {r.title}
                    </p>
                    {r.excerpt && (
                      <p className="text-[0.75rem] text-[#888] mt-[2px] mb-0 whitespace-nowrap overflow-hidden text-ellipsis">
                        {r.excerpt}
                      </p>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-center p-[24px] text-[#888] text-[0.875rem] m-0">
            {locale === 'da'
              ? `Ingen resultater for "${query}"`
              : `No results for "${query}"`}
          </p>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <p className="text-center p-[20px] text-[#bbb] text-[0.8rem] m-0">
            {locale === 'da'
              ? 'Skriv mindst 2 tegn for at søge'
              : 'Type at least 2 characters to search'}
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
