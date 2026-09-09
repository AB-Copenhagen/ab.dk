import { checkBotId } from 'botid/server';

/** Verifies the current request against BotID; returns a 403 Response for bots, or null for humans. */
export async function rejectIfBot(): Promise<Response | null> {
  const verification = await checkBotId();
  if (!verification.isBot) return null;

  return new Response(
    JSON.stringify({ success: false, error: 'Bot detected' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
