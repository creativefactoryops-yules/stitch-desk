// api/signup.js — Trial signup notification.
// POST /api/signup {name, businessName, email}
// Sends Yules a Telegram message so she knows the moment a shop starts a trial.
// Env: TELEGRAM_BOT_TOKEN (set in Vercel), OWNER_CHAT_ID (Yules's Telegram chat id).
// If OWNER_CHAT_ID is not set, falls back to the numeric id below (a chat id is not a secret).
// The bot token is never returned or logged.
const OWNER_CHAT_ID_FALLBACK = 7498186985; // Yules's Telegram chat id, from her /start Nov 6, 2026

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ownerChatId = process.env.OWNER_CHAT_ID || OWNER_CHAT_ID_FALLBACK;
  if (!BOT_TOKEN) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });
  if (!ownerChatId) return res.status(500).json({ ok: false, error: 'OWNER_CHAT_ID not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const name = String(body.name || '').trim();
  const business = String(body.businessName || body.business || '').trim();
  const email = String(body.email || '').trim();
  if (!name || !business || !email) {
    return res.status(400).json({ ok: false, error: 'name, businessName and email are required' });
  }

  const text =
    `\u{1F9F5} <b>New StitchDesk trial started</b>\n\n` +
    `<b>Name:</b> ${esc(name)}\n` +
    `<b>Business:</b> ${esc(business)}\n` +
    `<b>Email:</b> ${esc(email)}\n` +
    `<b>When:</b> ${new Date().toISOString()}`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ownerChatId, text, parse_mode: 'HTML' }),
    });
    const j = await r.json();
    if (!j.ok) return res.status(502).json({ ok: false, error: j.description || 'Telegram send failed' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}
