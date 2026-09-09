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

  const { name, email, reason } = json;
  if (!name?.trim() || !email?.trim()) {
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

  const to = import.meta.env.CONTACT_EMAIL ?? 'info@ab.dk';
  const reasonText = reason?.trim() || 'Ingen begrundelse angivet.';

  try {
    await sendMail({
      to,
      subject: `Anmodning om sletning af profil: ${name.trim()}`,
      text: `Navn: ${name.trim()}\nProfil-e-mail: ${email.trim()}\n\nBegrundelse:\n${reasonText}`,
      html: `<p><strong>Navn:</strong> ${escapeHtml(name.trim())}</p><p><strong>Profil-e-mail:</strong> <a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a></p><hr><p><strong>Begrundelse:</strong><br>${escapeHtml(reasonText).replace(/\n/g, '<br>')}</p>`,
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
