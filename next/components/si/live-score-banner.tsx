'use client';

/**
 * LiveScoreBanner — Client Component.
 * Shows the current live score when AB has a match in progress.
 * Polls the SI API every 30s via SWR — only active when statusType === 'inprogress'.
 * Renders nothing when there is no live match.
 */
import useSWR from 'swr';

interface LiveEvent {
  eventId: number;
  statusType: string;
  homeName: string;
  awayName: string;
  homeId: number;
  score: string | null;
  detailedScore: string | null;
  tournamentName: string;
}

interface Props {
  locale: string;
  /** Pre-fetched event from the server (used as SWR fallback). */
  initialEvent?: LiveEvent | null;
}

async function fetchLiveEvent(url: string): Promise<LiveEvent | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const events: LiveEvent[] = await res.json();
  return events.find((e) => e.statusType === 'inprogress') ?? null;
}

export function LiveScoreBanner({ locale, initialEvent }: Props) {
  const { data: event } = useSWR<LiveEvent | null>(
    '/api/si/live',
    fetchLiveEvent,
    {
      fallbackData: initialEvent ?? null,
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    }
  );

  if (!event || event.statusType !== 'inprogress') return null;

  const isABHome = event.homeId === 9805;
  const [homeScore, awayScore] = (event.score ?? '0-0').split('-');

  return (
    <a
      href={`/${locale}/kampe/${event.eventId}`}
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
      style={{ background: 'var(--ab-green)', color: 'white' }}
      aria-label={`Live: ${event.homeName} ${event.score} ${event.awayName}`}
    >
      <span className="ab-live-dot" />
      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.6rem', letterSpacing: '0.14em' }}>
        {locale === 'da' ? 'LIVE' : 'LIVE'}
      </span>

      <span className={isABHome ? 'text-white' : 'text-white/60'}>
        {event.homeName}
      </span>

      <span
        className="tabular-nums px-2 py-0.5 text-base"
        style={{ color: 'var(--ab-neon)', background: 'rgba(0,0,0,0.25)' }}
      >
        {homeScore} – {awayScore}
      </span>

      <span className={!isABHome ? 'text-white' : 'text-white/60'}>
        {event.awayName}
      </span>
    </a>
  );
}
