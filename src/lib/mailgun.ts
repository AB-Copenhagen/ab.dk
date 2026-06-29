const MAILGUN_API_KEY = import.meta.env.MAILGUN_API_KEY ?? '';
const MAILGUN_DOMAIN = import.meta.env.MAILGUN_DOMAIN ?? '';
const MAILGUN_FROM = import.meta.env.MAILGUN_FROM ?? `AB 1889 <no-reply@${MAILGUN_DOMAIN}>`;
const MAILGUN_API_BASE = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}`;

interface SendParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendMail(params: SendParams): Promise<void> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error('Mailgun not configured — MAILGUN_API_KEY and MAILGUN_DOMAIN required');
  }

  const body = new URLSearchParams({
    from: MAILGUN_FROM,
    to: params.to,
    subject: params.subject,
    ...(params.text ? { text: params.text } : {}),
    ...(params.html ? { html: params.html } : {}),
    ...(params.replyTo ? { 'h:Reply-To': params.replyTo } : {}),
  });

  const res = await fetch(`${MAILGUN_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Mailgun error ${res.status}: ${detail}`);
  }
}

export async function addToMailingList(
  listAddress: string,
  member: { address: string; name?: string }
): Promise<void> {
  if (!MAILGUN_API_KEY) throw new Error('MAILGUN_API_KEY not configured');

  const body = new URLSearchParams({
    address: member.address,
    ...(member.name ? { name: member.name } : {}),
    subscribed: 'true',
    upsert: 'true',
  });

  const res = await fetch(
    `https://api.eu.mailgun.net/v3/lists/${listAddress}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Mailgun list error ${res.status}: ${detail}`);
  }
}
