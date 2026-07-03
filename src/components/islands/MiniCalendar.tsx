import { useState } from 'react';

interface EventSlim {
  startDate: string;
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

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const today = now.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  const totalCells = Math.ceil((blanks + daysInMonth) / 7) * 7;

  const matchDays = new Set<number>(
    events
      .filter((e) => {
        const d = new Date(e.startDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((e) => new Date(e.startDate).getDate())
  );

  const monthName = new Date(year, month, 1).toLocaleDateString(
    locale === 'da' ? 'da-DK' : 'en-US',
    { month: 'long' }
  );

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - blanks + 1;
    const valid = day >= 1 && day <= daysInMonth;
    return {
      day,
      valid,
      isToday: valid && isCurrentMonth && day === today,
      hasMatch: valid && matchDays.has(day),
    };
  });

  const goPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const goNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  return (
    <div id="mini-calendar" className="lg:col-span-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between bg-ab-green">
        <button type="button" onClick={goPrev} aria-label={prevMonthLabel} style={navBtnStyle}>
          <svg width="18" height="24" viewBox="0 0 18 24" fill="none" aria-hidden="true">
            <path d="M14 2L4 12L14 22" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <h3
          className="font-black text-white text-center leading-[0.86] tracking-[-0.04em] capitalize"
          style={{ fontSize: 'clamp(1.5rem,2.8vw,2.1875rem)' }}
        >
          {monthName}
          <br />
          {monthScheduleLabel}
        </h3>
        <button type="button" onClick={goNext} aria-label={nextMonthLabel} style={navBtnStyle}>
          <svg width="18" height="24" viewBox="0 0 18 24" fill="none" aria-hidden="true">
            <path d="M4 2L14 12L4 22" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 text-center py-2.5 bg-ab-neon">
        {dayLabels.map((lbl, i) => (
          <span key={i} className="text-base font-black text-ab-green tracking-[-0.04em]">
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
          const base = 'flex items-center justify-center min-h-[4.5rem] text-base tracking-[-0.04em] text-ab-green';
          if (cell.hasMatch) {
            return (
              <a
                key={i}
                href={kampeHref}
                className={`${base} font-black hover:bg-ab-green/10 transition-colors`}
                style={cell.isToday ? { background: '#fff' } : undefined}
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

      {/* Footer */}
      <div className="text-center py-5 bg-[#f4f4f4]">
        <a href={kampeHref} className="text-base font-normal underline text-ab-green tracking-[-0.02em]">
          {seeAllLabel}
        </a>
      </div>
    </div>
  );
}
