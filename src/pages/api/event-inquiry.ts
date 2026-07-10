import type { APIRoute } from 'astro';

import { sendMail } from '@/lib/mailgun';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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

  const { name, email, phone, eventType, eventDate, guestCount, message } =
    json;
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

  const to = import.meta.env.CONTACT_EMAIL ?? 'info@ab.dk';

  const lines = [
    `Navn: ${name.trim()}`,
    `E-mail: ${email.trim()}`,
    phone?.trim() ? `Telefon: ${phone.trim()}` : null,
    eventType?.trim() ? `Type af arrangement: ${eventType.trim()}` : null,
    eventDate?.trim() ? `Ønsket dato: ${eventDate.trim()}` : null,
    guestCount?.toString().trim() ? `Antal gæster: ${guestCount.toString().trim()}` : null,
  ].filter(Boolean);

  try {
    await sendMail({
      to,
      subject: `Event-forespørgsel: ${name.trim()}`,
      text: `${lines.join('\n')}\n\n${message.trim()}`,
      html: `<p>${lines.map((l) => `<strong>${l!.split(':')[0]}:</strong>${l!.split(':').slice(1).join(':')}`).join('</p><p>')}</p><hr><p>${message.trim().replace(/\n/g, '<br>')}</p>`,
      replyTo: email.trim(),
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
