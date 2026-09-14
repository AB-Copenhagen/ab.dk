import type { APIContext } from 'astro';
import { fetchABEvents, cupTournamentLabel, isCupMatch } from '@/lib/si/client';
import { abConfig } from '@/lib/config/ab';

export const prerender = false;

// Same window as the fixtures pages (src/pages/en/matches.astro,
// src/pages/kampe.astro) — a season back for context, a few months ahead so
// a subscribed calendar app always has upcoming fixtures to show.
function seasonWindow(): { fromDate: string; toDate: string } {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 11);
  const to = new Date(now);
  to.setMonth(to.getMonth() + 3);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

// RFC 5545 TEXT escaping — backslash first (so it doesn't double-escape the
// backslashes this function itself introduces below), then the other
// characters it's used to introduce, then real newlines as the literal `\n`
// escape sequence (NOT an actual line break — line breaks inside a value are
// only ever the fold continuation below, never a semantic newline).
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// RFC 5545 §3.1 line folding: no single content line may exceed 75 octets;
// longer ones continue on subsequent lines starting with a single space.
// Must run on individual property lines only (never on an already-joined
// multi-line block), or it'll fold mid-property instead of mid-value.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    result += '\r\n ' + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // kickoff + ~2h (incl. build-up/stoppage)

export async function GET({ url }: APIContext) {
  const locale = url.searchParams.get('locale') === 'da' ? 'da' : 'en';
  const t = {
    calName: locale === 'da' ? 'AB 1889 Kampe' : 'AB 1889 Fixtures',
    matchDetails: locale === 'da' ? 'Kampdetaljer' : 'Match details',
    venue: locale === 'da' ? 'Bane' : 'Venue',
  };

  let events: Awaited<ReturnType<typeof fetchABEvents>> = [];
  try {
    events = await fetchABEvents({ ...seasonWindow(), limit: 200, allCompetitions: true });
  } catch {
    // SI unavailable — still return a syntactically valid (empty) feed
    // rather than a 502, so a subscribed calendar app doesn't hard-fail.
  }

  const dtstamp = toIcsUtc(new Date().toISOString());

  // Flat list of individual property lines — each one folded independently
  // below, never a pre-joined multi-line block (folding that would fold mid-
  // property instead of mid-value).
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Akademisk Boldklub//ab.dk Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(t.calName)}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];

  for (const event of events) {
    const isABHome = event.homeId === abConfig.teamId;
    const summary = `${event.homeName} vs ${event.awayName}`;
    const competition = isCupMatch(event) ? cupTournamentLabel(event, locale) : event.tournamentName;
    const venueName = event.properties?.venueName ?? (isABHome ? 'Gladsaxe Stadion' : event.homeName);
    const matchUrl = `https://ab.dk/${locale === 'da' ? 'kamp' : 'en/match'}/${event.eventId}`;
    const description = `${competition}\n${t.venue}: ${venueName}\n${t.matchDetails}: ${matchUrl}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:ab-match-${event.eventId}@ab.dk`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toIcsUtc(event.startDate)}`,
      `DTEND:${toIcsUtc(new Date(new Date(event.startDate).getTime() + MATCH_DURATION_MS).toISOString())}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `LOCATION:${escapeText(venueName)}`,
      `URL:${matchUrl}`,
      `STATUS:${event.statusType === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const ics = lines.map(foldLine).join('\r\n') + '\r\n';

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // Not an attachment: browsers hitting this URL directly should hand it
      // to the OS calendar app (subscribe/import prompt) rather than force a
      // file download — matches the webcal:// subscribe flow this feeds.
      'Content-Disposition': 'inline; filename="ab-fixtures.ics"',
      // Calendar apps re-poll subscribed feeds on their own schedule (hours,
      // not minutes) — s-maxage lets the CDN absorb that without re-hitting
      // the SI API on every poll.
      'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
