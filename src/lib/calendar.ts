import { estimatedMatchEndDate } from '@/lib/structured-data';

interface MatchCalendarInput {
  homeName: string;
  awayName: string;
  startDate: string;
  venueName: string;
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}

/** Builds a minimal RFC 5545 VCALENDAR/VEVENT for a single match. */
export function buildMatchIcs({
  eventId,
  homeName,
  awayName,
  startDate,
  venueName,
}: MatchCalendarInput & { eventId: number }): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AB 1889//ab.dk//EN',
    'BEGIN:VEVENT',
    `UID:match-${eventId}@ab.dk`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(startDate)}`,
    `DTEND:${icsDate(estimatedMatchEndDate(startDate))}`,
    `SUMMARY:${escapeIcsText(`${homeName} vs ${awayName}`)}`,
    `LOCATION:${escapeIcsText(venueName)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function icsDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** Google Calendar "quick add" link — no auth/API key required. */
export function googleCalendarUrl({
  homeName,
  awayName,
  startDate,
  venueName,
}: MatchCalendarInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${homeName} vs ${awayName}`,
    dates: `${icsDate(startDate)}/${icsDate(estimatedMatchEndDate(startDate))}`,
    location: venueName,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
