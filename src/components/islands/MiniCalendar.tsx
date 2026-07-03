import { useState } from 'react';

interface EventSlim {
  startDate: string;
  homeName: string;
  awayName: string;
  homeId: number;
}

interface Props {
  events: EventSlim[];
  locale: string;
  kampeHref: string;
  dayLabels: string[];
  monthScheduleLabel: string;
  seeAllLabel: string;
  prevMonthLabel: string;
  nextMonthLabel: string;
}

const AB_TEAM_ID = 9805;

const navBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '1.5rem',
  height: '1.5rem',
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'var(--ab-white)',
  cursor: 'pointer',
};

function fmtTime(startDate: string, locale: string): string {
  return new Date(startDate).toLocaleTimeString(
    locale === 'da' ? 'da-DK' : 'en-US',
    { hour: '2-digit', minute: '2-digit' }
  );
}

export default function MiniCalendar({
  events,
  locale,
  kampeHref,
  dayLabels,
  monthScheduleLabel,
  seeAllLabel,
  prevMonthLabel,
  nextMonthLabel,
}: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const today = now.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  const totalCells = Math.ceil((blanks + daysInMonth) / 7) * 7;

  // Group events by YYYY-MM-DD key
  const eventsByDate = new Map<string, EventSlim[]>();
  events.forEach((e) => {
    const key = e.startDate.slice(0, 10);
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  });

  const monthName = new Date(year, month, 1).toLocaleDateString(
    locale === 'da' ? 'da-DK' : 'en-US',
    { month: 'long' }
  );

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - blanks + 1;
    const valid = day >= 1 && day <= daysInMonth;
    const dateKey = valid
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null;
    return {
      day,
      valid,
      isToday: valid && isCurrentMonth && day === today,
      hasMatch: valid && !!dateKey && eventsByDate.has(dateKey),
      dateKey,
    };
  });

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };

  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  // Resolve hover info for the footer
  const hoveredEvents = hoveredKey ? (eventsByDate.get(hoveredKey) ?? []) : [];
  const hoveredEvent = hoveredEvents[0] ?? null;
  const footerMatchInfo = hoveredEvent
    ? (() => {
        const isHome = hoveredEvent.homeId === AB_TEAM_ID;
        const opponent = isHome ? hoveredEvent.awayName : hoveredEvent.homeName;
        const vs = isHome
          ? locale === 'da'
            ? `AB vs ${opponent}`
            : `AB vs ${opponent}`
          : locale === 'da'
            ? `${opponent} vs AB`
            : `${opponent} vs AB`;
        const time = fmtTime(hoveredEvent.startDate, locale);
        return { vs, time };
      })()
    : null;

  return (
    <div id="mini-calendar" className="lg:col-span-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between bg-ab-green">
        <button
          type="button"
          onClick={goPrev}
          aria-label={prevMonthLabel}
          style={navBtnStyle}
        >
          <svg
            width="10"
            height="14"
            viewBox="0 0 18 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M14 2L4 12L14 22" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <h3
          className="font-black text-white text-center leading-none tracking-[-0.04em] capitalize whitespace-nowrap"
          style={{ fontSize: '1.125rem' }}
        >
          {monthName} {monthScheduleLabel}
        </h3>
        <button
          type="button"
          onClick={goNext}
          aria-label={nextMonthLabel}
          style={navBtnStyle}
        >
          <svg
            width="10"
            height="14"
            viewBox="0 0 18 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 2L14 12L4 22" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 text-center py-2.5 bg-ab-neon">
        {dayLabels.map((lbl, i) => (
          <span
            key={i}
            className="text-base font-black text-ab-green tracking-[-0.04em]"
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 bg-[#f4f4f4]">
        {cells.map((cell, i) => {
          if (!cell.valid) {
            return <div key={i} className="invisible min-h-[4.5rem]" />;
          }
          const base =
            'flex items-center justify-center min-h-[4.5rem] text-base tracking-[-0.04em] text-ab-green';
          if (cell.hasMatch && cell.dateKey) {
            return (
              <a
                key={i}
                href={`${kampeHref}#${cell.dateKey}`}
                className={`${base} font-black hover:bg-ab-green/10 transition-colors`}
                style={cell.isToday ? { background: '#fff' } : undefined}
                onMouseEnter={() => setHoveredKey(cell.dateKey)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {cell.day}
              </a>
            );
          }
          return (
            <div
              key={i}
              className={`${base} ${cell.isToday ? 'bg-white font-black' : 'font-normal'}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      {/* Footer — shows match info on hover, link otherwise */}
      <div className="px-6 py-4 bg-[#f4f4f4] flex items-center justify-between min-h-[3.5rem]">
        {footerMatchInfo ? (
          <>
            <span className="text-sm font-black text-ab-green tracking-[-0.02em] truncate pr-3">
              {footerMatchInfo.vs}
            </span>
            <span className="text-sm font-normal text-ab-green/70 tracking-[-0.02em] shrink-0">
              {footerMatchInfo.time}
            </span>
          </>
        ) : (
          <a
            href={kampeHref}
            className="text-sm font-black text-ab-green tracking-[-0.02em] underline underline-offset-2"
          >
            {seeAllLabel}
          </a>
        )}
      </div>
    </div>
  );
}
