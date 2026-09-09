// Read via `process.env` (not `import.meta.env`) so these are resolved live at
// request time. `import.meta.env.X` gets statically inlined by Vite at build
// time — if MAILGUN_API_KEY/MAILGUN_DOMAIN aren't exposed to the *build* step
// (e.g. marked as a Vercel "Sensitive" env var, which is runtime-only by
// design), Vite bakes in an empty string and dead-code-eliminates everything
// past the config check below, permanently, until the next rebuild.
// `process.env` isn't touched by that static analysis, so a value change
// takes effect without redeploying.
function mailgunEnv() {
  const apiKey = process.env.MAILGUN_API_KEY ?? '';
  const domain = process.env.MAILGUN_DOMAIN ?? '';
  const from = process.env.MAILGUN_FROM || `AB 1889 <no-reply@${domain}>`;
  return { apiKey, domain, from };
}

interface SendParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendMail(params: SendParams): Promise<void> {
  const { apiKey, domain, from } = mailgunEnv();
  if (!apiKey || !domain) {
    throw new Error(
      'Mailgun not configured — MAILGUN_API_KEY and MAILGUN_DOMAIN required'
    );
  }

  const body = new URLSearchParams({
    from,
    to: params.to,
    subject: params.subject,
    ...(params.text ? { text: params.text } : {}),
    ...(params.html ? { html: params.html } : {}),
    ...(params.replyTo ? { 'h:Reply-To': params.replyTo } : {}),
  });

  const res = await fetch(`https://api.eu.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
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
  const { apiKey } = mailgunEnv();
  if (!apiKey) throw new Error('MAILGUN_API_KEY not configured');

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
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
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
