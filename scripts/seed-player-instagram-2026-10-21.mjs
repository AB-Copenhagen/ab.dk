#!/usr/bin/env node
// One-off: sets Player.instagramUrl in Strapi from the club's social-links
// sheet (IG.pdf, 2026-10-21). Matches sheet rows to SI player IDs via the
// public squad feed (name, then shirt number as a tiebreaker).
//
// Only updates players that already have a Strapi row — creating a row for a
// player who has none would flip them off the legacy "pending photo" fallback.
// Those players are reported at the end instead.
//
// Requires the `instagramUrl` field to be deployed in Strapi first.
// Dry run by default. Usage:
//   node --env-file=.env.local scripts/seed-player-instagram-2026-10-21.mjs [--apply]
const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/$/,
  ''
);
const TOKEN = process.env.STRAPI_API_TOKEN;
const APPLY = process.argv.includes('--apply');
if (!TOKEN) {
  console.error('Missing STRAPI_API_TOKEN');
  process.exit(1);
}

const SQUAD_FEED = 'https://ab.dk/api/squad.json';

const SHEET = [
  ['Marcus Bobjerg', 1, 'marcusbobjerg30'],
  ['Michael Stone', 25, 'mstone1199'],
  ['Adam Ingi Benediktsson', 54, 'a.benediktsson'],
  ['Travian Sousa', 3, 'trasousa3'],
  ['Adrien Koudelka', 4, 'adrienkoudelka'],
  ['Marc Dal Hende', 5, 'dalhende5'],
  ['Gabriel Noga', 14, 'g.noga'],
  ['Marius Stenner', 17, 'marius.stenner'],
  ['Tobias Damtoft', 23, 'tobiasdamtoft'],
  ['Aidan Liu', 24, 'aidan_liu20'],
  ['William Warrer', 33, 'williamwarrer'],
  ['Mikkel Brund', 34, 'mikkelbrund_'],
  ['Frederik Lindgaard', 37, 'f_lindgaard'],
  ['Søren Ilsøe', 15, 'sorenulrikilsoe'],
  ['Mikkel Clement', 21, 'mikkel__clement'],
  ['Marco Vesterholm', 22, 'marco_vesterholm'],
  ['Tobias Lykkebak', 28, 'tobias_lykkebak'],
  ['Alfred Horup', 30, 'alfredhorup'],
  ['Noah Engell', 7, 'noah_engell'],
  ['Marco Ramkilde', 10, 'mramkilde'],
  ['Casper Grening', 11, 'caspergrening'],
  ['Milan Silva Rasmussen', 18, 'milanjustin'],
  ['Jonathan Mathys', 19, 'jonathan.mathys'],
  ['Marcus Immersen', 20, 'marcus_immersen'],
  ['Saliou Diop', 29, 'serigne_s29'],
  ['Tobias Hageltorn', 41, 'tobiashageltorn'],
  ['Jermain Fernandes', 77, 'jjfernandes._'],
  ["O'Vonte Mullings", 88, '_omullings'],
];

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/å/gi, 'aa')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};
const api = async (method, path, body) => {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, {
    method,
    headers,
    body: body && JSON.stringify({ data: body }),
  });
  if (!res.ok)
    throw new Error(
      `${method} ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`
    );
  return res.status === 204 ? null : res.json();
};

const squad = (await (await fetch(SQUAD_FEED)).json()).players ?? [];
const idOf = (p) => Number(/\/spiller\/(-?\d+)/.exec(p.url)?.[1]);
const squadByName = new Map(squad.map((p) => [norm(p.name), p]));
const squadByShirt = new Map(squad.map((p) => [Number(p.shirtNumber), p]));

const skipped = [];
for (const [name, shirt, handle] of SHEET) {
  const match = squadByName.get(norm(name)) ?? squadByShirt.get(shirt);
  if (!match) {
    skipped.push(`${name}: not found in squad feed`);
    continue;
  }
  const siPlayerId = idOf(match);
  const url = `https://www.instagram.com/${handle}/`;
  const rows = (
    await api(
      'GET',
      `players?filters[siPlayerId][$eq]=${siPlayerId}&locale=da&status=draft`
    )
  ).data;
  if (rows.length === 0) {
    skipped.push(`${name} (${siPlayerId}): no Strapi row`);
    continue;
  }
  for (const row of rows) {
    console.log(
      `${APPLY ? 'SET' : 'would set'} ${name} (${siPlayerId}, ${row.documentId}) → ${url}`
    );
    if (APPLY) {
      // instagramUrl is non-localized, so one write covers da + en.
      await api('PUT', `players/${row.documentId}?locale=da`, {
        instagramUrl: url,
      });
    }
  }
}
if (skipped.length)
  console.log('\nSkipped:\n' + skipped.map((s) => `  - ${s}`).join('\n'));
if (!APPLY) console.log('\nDry run — re-run with --apply to write.');
