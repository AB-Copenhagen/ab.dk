/**
 * FixturesWidget — Server Component.
 * Renders AB's upcoming and recent fixtures from the SportsInnovation API.
 * Cache: ISR 60s (Next.js fetch cache via unstable_cache in the SI client).
 */
import { fetchABEvents } from '@/lib/si/client';
import type { Locale } from '@/i18n.config';

interface Props {
  locale: Locale;
  limit?: number;
}

function formatDate(dateStr: string, locale: Locale): string {
  return new Date(dateStr).toLocaleDateString(
    locale === 'da' ? 'da-DK' : 'en-GB',
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'inprogress') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ab-neon)' }}>
        <span className="ab-live-dot" />
        LIVE
      </span>
    );
  }
  if (status === 'finished') {
    return <span className="text-xs uppercase tracking-wider" style={{ color: '#7A9185' }}>FT</span>;
  }
  return null;
}

export async function FixturesWidget({ locale, limit = 6 }: Props) {
  let events;
  try {
    events = await fetchABEvents({ locale, limit });
  } catch {
    return (
      <div className="text-xs py-4 text-center" style={{ color: '#7A9185' }}>
        {locale === 'da' ? 'Kampprogram ikke tilgængeligt' : 'Fixtures unavailable'}
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="text-xs py-4 text-center" style={{ color: '#7A9185' }}>
        {locale === 'da' ? 'Ingen kampe fundet' : 'No fixtures found'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1A2018]">
      {events.slice(0, limit).map((event) => {
        const isABHome = event.homeId === 9805;
        const opponent = isABHome ? event.awayName : event.homeName;
        const isFinished = event.statusType === 'finished';
        const isLive = event.statusType === 'inprogress';

        return (
          <div
            key={event.eventId}
            className="flex items-center justify-between py-3 px-4 gap-4 hover:bg-[#0D1410] transition-colors"
          >
            {/* Date */}
            <div className="min-w-[120px]">
              <span className="text-xs" style={{ color: '#7A9185' }}>
                {formatDate(event.startDate, locale)}
              </span>
            </div>

            {/* Match */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide text-white truncate">
                {isABHome ? 'AB' : opponent}
              </span>
              {(isFinished || isLive) && event.score ? (
                <span
                  className="text-sm font-bold tabular-nums px-2 py-0.5"
                  style={{
                    color: isLive ? 'var(--ab-neon)' : 'var(--ab-gold)',
                    background: isLive ? 'rgba(0,255,31,0.08)' : 'rgba(214,160,42,0.08)',
                  }}
                >
                  {event.score}
                </span>
              ) : (
                <span className="text-xs" style={{ color: '#7A9185' }}>vs</span>
              )}
              <span className="text-xs font-bold uppercase tracking-wide text-white truncate">
                {isABHome ? opponent : 'AB'}
              </span>
            </div>

            {/* Status */}
            <div className="min-w-[40px] text-right">
              <StatusBadge status={event.statusType} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
