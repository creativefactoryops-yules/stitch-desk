// api/telegram.js — Telegram Stars + e-Transfer webhook — BuildYou StitchDesk
// Env: TELEGRAM_BOT_TOKEN, SHOP_NAME
// Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://stitch-desk-sage.vercel.app/api/telegram

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  const update = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(200).send('no token');

  const sendMessage = async (chatId, text, opts={}) => {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...opts })
    });
  };

  const shop = update.message?.text?.split(' ')[1] || process.env.SHOP_NAME || 'buildyou';

  // /start — welcome, explain the free week. No charge here.
  if (update.message?.text?.startsWith('/start')) {
    const chatId = update.message.chat.id;
    await sendMessage(chatId, `🟢 <b>StitchDesk Toolkit — for your upholstery shop</b>

Your first 14 days are <b>free</b> — quote calculator, yardage, suppliers, invoice builder and more.

<b>After your 14-day trial — $20 CAD/mo:</b>
1️⃣ Telegram Stars: type /pay and I'll send you an invoice
2️⃣ e-Transfer: send $20 CAD to <code>forcebuildyou@gmail.com</code>
   Message: StitchDesk + ${shop}

Reply with a screenshot after e-transfer and I'll unlock your toolkit access.

Live site: https://stitchdesk.vercel.app/?ref=${shop}`);
    return res.status(200).send('ok');
  }

  // /pay — Stars invoice for $20 CAD
  if (update.message?.text?.startsWith('/pay')) {
    const chatId = update.message.chat.id;
    // Stars: ~700 Stars ≈ $20 CAD in-app (~$0.02/Star USD, ~$14 USD ≈ $20 CAD — VERIFY in Telegram before first charge; creator payout ~$0.013/Star, 1,000-Star minimum withdrawal, 21-day hold)
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        title: `StitchDesk — ${shop} — $20/mo CAD`,
        description: `StitchDesk Toolkit for your upholstery shop. $20 CAD/mo. Cancel anytime.`,
        payload: `stitchdesk_${shop}_${Date.now()}`,
        currency: 'XTR',
        prices: [{ label: 'StitchDesk Monthly', amount: 700 }],
        start_parameter: 'stitchdesk_pay'
      })
    }).catch(async () => {
      // Fallback if Stars invoice fails — send manual instructions
      await sendMessage(chatId, `🟢 <b>StitchDesk — pay $20 CAD/mo</b>

Shop: ${shop}

1️⃣ Stars: type /pay again, or
2️⃣ e-Transfer: send $20 CAD to <code>forcebuildyou@gmail.com</code>
   Message: StitchDesk + ${shop}

Reply with a screenshot after payment and I'll unlock your toolkit access.`);
    });
    return res.status(200).send('ok');
  }

  // Handle successful payment
  if (update.pre_checkout_query) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true })
    });
  }

  if (update.message?.successful_payment) {
    const chatId = update.message.chat.id;
    const pay = update.message.successful_payment;
    await sendMessage(chatId, `✅ Payment received: ${pay.total_amount} ${pay.currency}

Your StitchDesk Toolkit is activating!

Live link: https://stitch-desk-sage.vercel.app/?ref=${process.env.SHOP_NAME || 'buildyou'}

Toolkit access will be unlocked. Reply with your shop name.

Welcome aboard. 🧵`);
    // TODO: Save to Supabase / issue Twilio number automatically
  }

  return res.status(200).send('ok');
}
