function slugToOpponentKey(slug: string): string {
  return slug
    .replace(/^ab-(?:mod|vs)-/i, '')
    .replace(/-[a-z0-9]{6}$/i, '')
    .replace(/-/g, ' ')
    .toLowerCase();
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9æøå]/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3);
}

function opponentsMatch(billetKey: string, siName: string): boolean {
  const bt = tokenize(billetKey);
  const st = tokenize(siName);
  if (bt.length === 0 || st.length === 0) return false;
  return bt.some((b) =>
    st.some(
      (s) =>
        b === s ||
        (b.length >= 4 && s.includes(b)) ||
        (s.length >= 4 && b.includes(s))
    )
  );
}

export async function fetchBilletTicketMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch('https://billet.ab.dk/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AB-Site/1.0)' },
      signal: AbortSignal.timeout(4000),
    });
    const html = await res.text();
    const re = /href="(\/event\/(ab-(?:mod|vs)-[^"]+))"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const path = m[1]!;
      const slug = m[2]!;
      const key = slugToOpponentKey(slug);
      if (key && !map.has(key)) map.set(key, `https://billet.ab.dk${path}`);
    }
  } catch {
    // billet.ab.dk unavailable — fallback to generic URL
  }
  return map;
}

export function findTicketUrl(
  billetMap: Map<string, string>,
  opponentName: string
): string | null {
  for (const [key, url] of billetMap) {
    if (opponentsMatch(key, opponentName)) return url;
  }
  return null;
}
