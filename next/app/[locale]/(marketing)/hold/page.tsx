import type { Metadata } from 'next';

import { Container } from '@/components/container';
import { PlayerCard, type SquadPlayer } from '@/components/si/player-card';
import { fetchABSquad } from '@/lib/si/client';
import type { LocaleParamsProps } from '@/types/types';
import type { Locale } from '@/i18n.config';

export const metadata: Metadata = {
  title: 'Holdet | Akademisk Boldklub',
  description: 'Spillertruppen for Akademisk Boldklub — 1. division.',
};

const POSITION_GROUPS = {
  goalkeeper: { da: 'Målmænd', en: 'Goalkeepers' },
  defender:   { da: 'Forsvarsspillere', en: 'Defenders' },
  midfielder: { da: 'Midtbanespillere', en: 'Midfielders' },
  forward:    { da: 'Angribere', en: 'Forwards' },
  other:      { da: 'Øvrige', en: 'Other' },
} as const;

type PositionKey = keyof typeof POSITION_GROUPS;
const GROUP_ORDER: PositionKey[] = ['goalkeeper', 'defender', 'midfielder', 'forward', 'other'];

function classifyPosition(position?: string): PositionKey {
  const p = (position ?? '').toLowerCase();
  if (p.includes('goal') || p.includes('keeper') || p.includes('målm')) return 'goalkeeper';
  if (p.includes('defend') || p.includes('back') || p.includes('forsvar')) return 'defender';
  if (p.includes('mid') || p.includes('midtb')) return 'midfielder';
  if (p.includes('forward') || p.includes('striker') || p.includes('wing') || p.includes('angr')) return 'forward';
  return 'other';
}

export default async function HoldPage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const l = locale as Locale;

  let squadRaw: unknown = null;
  try {
    squadRaw = await fetchABSquad(l);
  } catch {
    // SI API unavailable — render gracefully
  }

  const players: SquadPlayer[] = (
    Array.isArray(squadRaw)
      ? squadRaw
      : (squadRaw as any)?.members ?? (squadRaw as any)?.data ?? []
  ) as SquadPlayer[];

  // Group by position
  const groups = new Map<PositionKey, SquadPlayer[]>();
  for (const player of players) {
    const key = classifyPosition(player.position ?? player.role);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(player);
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A09' }}>
      {/* Page header */}
      <div className="border-b" style={{ borderColor: '#1A2018' }}>
        <Container>
          <div className="py-14 md:py-20">
            <p
              className="text-xs font-bold uppercase mb-3"
              style={{ color: '#D6A02A', letterSpacing: '0.2em' }}
            >
              {l === 'da' ? 'Sæson 2024/25' : 'Season 2024/25'}
            </p>
            <h1
              className="text-5xl md:text-6xl font-black text-white"
              style={{ letterSpacing: '-0.02em' }}
            >
              {l === 'da' ? 'Holdet' : 'The Squad'}
            </h1>
            {players.length > 0 && (
              <p className="mt-2 text-sm" style={{ color: '#7A9185' }}>
                {players.length} {l === 'da' ? 'spillere' : 'players'}
              </p>
            )}
            <div className="mt-5 h-0.5 w-12" style={{ background: '#006A52' }} />
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-10 lg:py-14">
          {players.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: '#7A9185' }}>
              {l === 'da'
                ? 'Holdoplysninger er ikke tilgængelige i øjeblikket.'
                : 'Squad information is currently unavailable.'}
            </p>
          ) : (
            GROUP_ORDER.map((key) => {
              const group = groups.get(key);
              if (!group?.length) return null;
              return (
                <section key={key} className="mb-14">
                  <div
                    className="flex items-baseline gap-3 mb-6 pb-3 border-b"
                    style={{ borderColor: '#1A2018' }}
                  >
                    <h2
                      className="text-xs font-bold uppercase"
                      style={{ color: '#D6A02A', letterSpacing: '0.18em' }}
                    >
                      {POSITION_GROUPS[key][l]}
                    </h2>
                    <span className="text-xs" style={{ color: '#7A9185' }}>
                      ({group.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {group.map((player) => (
                      <PlayerCard key={player.id ?? player.name} player={player} locale={l} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </Container>
    </div>
  );
}
