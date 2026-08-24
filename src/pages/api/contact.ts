import type { APIRoute } from 'astro';

import { rejectIfBot } from '@/lib/bot-check';
import { sendMail } from '@/lib/mailgun';
import { escapeHtml } from '@/lib/utils';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const botResponse = await rejectIfBot();
  if (botResponse) return botResponse;

  const json = await request.json().catch(() => null);

  if (!json) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { name, email, subject, message, locale } = json;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid email' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // `subject` carries a stable topic code from the form's dropdown (not free
  // text), so it can route to a different inbox per target without depending
  // on page locale.
  const topic = subject === 'partnerships' ? 'partnerships' : 'general';
  // Read via `process.env` (not `import.meta.env`) — see src/lib/mailgun.ts for
  // why: Vercel's "Sensitive" env vars are runtime-only, and `import.meta.env.X`
  // gets statically inlined at build time, which would permanently bake in an
  // empty string here. No inbox address is hardcoded — this is a public repo,
  // and the partnership manager's personal address shouldn't sit in source for
  // scrapers to find; if PARTNERSHIP_EMAIL isn't configured, partnership
  // inquiries fall back to the general inbox rather than going nowhere.
  const generalInbox = process.env.CONTACT_EMAIL || 'info@ab.dk';
  const to =
    topic === 'partnerships'
      ? process.env.PARTNERSHIP_EMAIL || generalInbox
      : generalInbox;

  // The form sends which page it was submitted from, so the notification
  // email — subject and field labels — matches the submitter's language
  // instead of always being Danish.
  const isEnglish = locale === 'en';
  const subjectLabel = isEnglish
    ? topic === 'partnerships'
      ? 'Partnership inquiry'
      : 'Contact form'
    : topic === 'partnerships'
      ? 'Partnerskabshenvendelse'
      : 'Kontaktformular';
  const nameLabel = isEnglish ? 'Name' : 'Navn';
  const emailLabel = 'E-mail';

  try {
    await sendMail({
      to,
      subject: `${subjectLabel}: ${name.trim()}`,
      text: `${nameLabel}: ${name.trim()}\n${emailLabel}: ${email.trim()}\n\n${message.trim()}`,
      html: `<p><strong>${nameLabel}:</strong> ${escapeHtml(name.trim())}</p><p><strong>${emailLabel}:</strong> <a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a></p><hr><p>${escapeHtml(message.trim()).replace(/\n/g, '<br>')}</p>`,
      replyTo: email.trim(),
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
