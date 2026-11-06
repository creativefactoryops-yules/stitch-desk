// api/telegram-debug.js — List recent Telegram updates so we can find the owner's chat id.
// Env: TELEGRAM_BOT_TOKEN (set in Vercel). The token is never returned or logged.
// NOTE: getUpdates only returns updates while NO webhook is set. Call this BEFORE
// /api/setup-webhook, or after deleting the webhook. GET /api/telegram-debug
export default async function handler(req, res) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=50&timeout=0`);
    const j = await r.json();
    if (!j.ok) return res.status(502).json({ ok: false, error: j.description || 'getUpdates failed' });

    const updates = (j.result || []).map((u) => {
      const m = u.message || u.channel_post || {};
      const chat = m.chat || {};
      return {
        update_id: u.update_id,
        chat_id: chat.id ?? null,
        chat_type: chat.type ?? null,
        first_name: chat.first_name ?? null,
        username: chat.username ?? null,
        text: m.text ?? null,
        date: m.date ? new Date(m.date * 1000).toISOString() : null,
      };
    });
    return res.status(200).json({ ok: true, count: updates.length, updates });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}
