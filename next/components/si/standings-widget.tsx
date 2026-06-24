/**
 * StandingsWidget — Server Component.
 * Renders the current 1.division league table with AB's row highlighted.
 * Cache: ISR 5min. Requires AB_TOURNAMENT_ID to be set.
 */
import { fetchStandings } from '@/lib/si/client';
import type { Locale } from '@/i18n.config';

interface Props {
  locale: Locale;
}

export async function StandingsWidget({ locale }: Props) {
  let data: any;
  try {
    data = await fetchStandings(locale);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const isUnconfigured = msg.includes('AB_TOURNAMENT_ID');
    return (
      <div className="text-xs py-4 text-center" style={{ color: '#7A9185' }}>
        {isUnconfigured
          ? 'Stilling ikke tilgængelig — AB_TOURNAMENT_ID mangler'
          : locale === 'da'
          ? 'Stilling ikke tilgængelig'
          : 'Standings unavailable'}
      </div>
    );
  }

  // SI API returns standings nested under data.standings or similar — adapt as needed
  const rows: any[] = data?.standings ?? data?.data ?? [];

  if (!rows.length) {
    return (
      <div className="text-xs py-4 text-center" style={{ color: '#7A9185' }}>
        {locale === 'da' ? 'Ingen data' : 'No data'}
      </div>
    );
  }

  const headers =
    locale === 'da'
      ? ['#', 'Hold', 'K', 'V', 'U', 'T', 'Mål', 'Pt']
      : ['#', 'Club', 'P', 'W', 'D', 'L', 'GD', 'Pts'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1A2018]">
            {headers.map((h) => (
              <th
                key={h}
                className="py-2 px-2 text-left font-bold uppercase tracking-widest first:pl-4 last:pr-4"
                style={{ color: '#7A9185', fontSize: '0.6rem', letterSpacing: '0.12em' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A2018]">
          {rows.map((row: any, i: number) => {
            const isAB = row.teamId === 9805 || row.team?.id === 9805;
            return (
              <tr
                key={row.teamId ?? i}
                className="transition-colors hover:bg-[#0D1410]"
                style={isAB ? { background: 'rgba(0,106,82,0.12)' } : undefined}
              >
                <td className="py-2.5 pl-4 pr-2 tabular-nums" style={{ color: isAB ? 'var(--ab-gold)' : '#7A9185' }}>
                  {row.position ?? i + 1}
                </td>
                <td className="py-2.5 px-2 font-bold" style={{ color: isAB ? 'var(--ab-gold)' : 'white' }}>
                  {row.teamName ?? row.team?.name ?? '—'}
                  {isAB && (
                    <span className="ml-1.5 text-[0.55rem] uppercase tracking-widest" style={{ color: 'var(--ab-green)' }}>
                      ▲
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2 tabular-nums" style={{ color: '#7A9185' }}>{row.played ?? '—'}</td>
                <td className="py-2.5 px-2 tabular-nums" style={{ color: '#7A9185' }}>{row.wins ?? '—'}</td>
                <td className="py-2.5 px-2 tabular-nums" style={{ color: '#7A9185' }}>{row.draws ?? '—'}</td>
                <td className="py-2.5 px-2 tabular-nums" style={{ color: '#7A9185' }}>{row.losses ?? '—'}</td>
                <td className="py-2.5 px-2 tabular-nums" style={{ color: '#7A9185' }}>{row.goalDifference ?? '—'}</td>
                <td className="py-2.5 pr-4 pl-2 font-bold tabular-nums" style={{ color: isAB ? 'var(--ab-gold)' : 'white' }}>
                  {row.points ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
