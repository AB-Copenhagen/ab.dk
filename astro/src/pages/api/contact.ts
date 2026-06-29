import type { APIRoute } from 'astro';
import { sendMail } from '@/lib/mailgun';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const json = await request.json().catch(() => null);

  if (!json) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, email, subject, message } = json;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid email' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const to = import.meta.env.CONTACT_EMAIL ?? 'kontakt@ab.dk';

  try {
    await sendMail({
      to,
      subject: subject?.trim() || `Kontaktformular: ${name.trim()}`,
      text: `Navn: ${name.trim()}\nE-mail: ${email.trim()}\n\n${message.trim()}`,
      html: `<p><strong>Navn:</strong> ${name.trim()}</p><p><strong>E-mail:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p><hr><p>${message.trim().replace(/\n/g, '<br>')}</p>`,
      replyTo: email.trim(),
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
