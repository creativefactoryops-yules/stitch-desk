// api/setup-webhook.js — Set the Telegram webhook for @stitchdesk_y_bot.
// Env: TELEGRAM_BOT_TOKEN (set in Vercel). The token is never returned or logged.
// GET /api/setup-webhook -> sets webhook, then returns getWebhookInfo.
export default async function handler(req, res) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });

  const api = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const webhookUrl = 'https://stitch-desk-sage.vercel.app/api/telegram';

  try {
    const setRes = await fetch(`${api}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: false }),
    });
    const setJson = await setRes.json();

    const infoRes = await fetch(`${api}/getWebhookInfo`);
    const infoJson = await infoRes.json();

    return res.status(200).json({
      ok: true,
      webhookUrl,
      setWebhook: { ok: setJson.ok, description: setJson.description || null, error: setJson.error_code || null },
      webhookInfo: infoJson.ok ? infoJson.result : { error: infoJson.description || 'getWebhookInfo failed' },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}
