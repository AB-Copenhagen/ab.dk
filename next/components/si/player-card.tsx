import type { Locale } from '@/i18n.config';

export interface SquadPlayer {
  id?: number;
  name?: string;
  position?: string;
  role?: string;
  jerseyNumber?: number;
  number?: number;
  nationality?: string;
  dateOfBirth?: string;
  stats?: {
    appearances?: number;
    goals?: number;
    assists?: number;
  };
}

export function PlayerCard({ player, locale }: { player: SquadPlayer; locale: Locale }) {
  const number = player.jerseyNumber ?? player.number;
  const position = player.position ?? player.role ?? '';

  return (
    <div
      className="relative border transition-colors duration-200 hover:border-[#006A52] group cursor-default"
      style={{ background: '#0D1410', borderColor: '#1A2018' }}
    >
      {number !== undefined && (
        <span
          className="absolute top-3 right-3 text-xs font-bold tabular-nums"
          style={{ color: '#D6A02A', opacity: 0.5 }}
        >
          {number}
        </span>
      )}

      {/* Silhouette placeholder */}
      <div
        className="flex items-end justify-center"
        style={{
          height: 96,
          background: 'linear-gradient(180deg, #081209 0%, #0D1410 100%)',
        }}
      >
        <svg width="44" height="56" viewBox="0 0 44 56" fill="none" style={{ opacity: 0.2 }}>
          <circle cx="22" cy="11" r="7" fill="#7A9185" />
          <path d="M8 26C8 18 36 18 36 26L40 50H4L8 26Z" fill="#7A9185" />
        </svg>
      </div>

      <div className="px-3 pt-3 pb-4">
        <p
          className="text-sm font-bold text-white leading-tight truncate transition-colors duration-200 group-hover:text-[#D6A02A]"
          title={player.name}
        >
          {player.name ?? '—'}
        </p>

        {position && (
          <p className="text-[0.6rem] uppercase tracking-widest mt-1 truncate" style={{ color: '#006A52' }}>
            {position}
          </p>
        )}

        {player.nationality && (
          <p className="text-[0.6rem] mt-1 truncate" style={{ color: '#7A9185' }}>
            {player.nationality}
          </p>
        )}

        {player.stats && (
          <div className="flex gap-4 mt-3 pt-2 border-t" style={{ borderColor: '#1A2018' }}>
            {player.stats.appearances !== undefined && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-widest" style={{ color: '#7A9185' }}>
                  {locale === 'da' ? 'Kam.' : 'App.'}
                </p>
                <p className="text-xs font-bold text-white tabular-nums">{player.stats.appearances}</p>
              </div>
            )}
            {player.stats.goals !== undefined && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-widest" style={{ color: '#7A9185' }}>
                  {locale === 'da' ? 'Mål' : 'Gls'}
                </p>
                <p className="text-xs font-bold text-white tabular-nums">{player.stats.goals}</p>
              </div>
            )}
            {player.stats.assists !== undefined && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-widest" style={{ color: '#7A9185' }}>
                  {locale === 'da' ? 'Ass.' : 'Ast.'}
                </p>
                <p className="text-xs font-bold text-white tabular-nums">{player.stats.assists}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
