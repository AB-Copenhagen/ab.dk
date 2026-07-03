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
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blogBase = locale === 'en' ? '/en/blog' : '/blog';

  const openModal = useCallback(() => {
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
    if (btn) btn.addEventListener('click', openModal);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? closeModal() : openModal();
      }
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      if (btn) btn.removeEventListener('click', openModal);
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 'clamp(60px,12vh,140px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '580px',
          margin: '0 16px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            style={{ flexShrink: 0, color: '#888' }}
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
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#111',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          {loading && (
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid #E5E7EB',
                borderTopColor: '#006A52',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                flexShrink: 0,
              }}
            />
          )}
          <button
            onClick={closeModal}
            style={{
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              color: '#888',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '8px 0',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {results.map((r, i) => (
              <li key={r.slug}>
                <a
                  href={`${blogBase}/${r.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 20px',
                    textDecoration: 'none',
                    background: i === active ? '#F0F9F5' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt=""
                      style={{
                        width: 52,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 40,
                        background: '#F3F4F6',
                        borderRadius: '4px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.1rem',
                          color: 'rgba(0,106,82,0.2)',
                          fontWeight: 900,
                        }}
                      >
                        AB
                      </span>
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    {r.category && (
                      <p
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#006A52',
                          margin: '0 0 2px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {r.category}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#111',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.title}
                    </p>
                    {r.excerpt && (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#888',
                          margin: '2px 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
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
          <p
            style={{
              textAlign: 'center',
              padding: '24px',
              color: '#888',
              fontSize: '0.875rem',
              margin: 0,
            }}
          >
            {locale === 'da'
              ? `Ingen resultater for "${query}"`
              : `No results for "${query}"`}
          </p>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <p
            style={{
              textAlign: 'center',
              padding: '20px',
              color: '#bbb',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
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
