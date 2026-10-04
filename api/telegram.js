// api/telegram.js — Telegram Stars + e-Transfer webhook — BuildYou StitchDesk
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_PAYMENT_PROVIDER (optional for Stars), SHOP_NAME
// Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.vercel.app/api/telegram

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

  // Handle /pay command — Stars
  if (update.message?.text?.startsWith('/pay') || update.message?.text?.startsWith('/start')) {
    const chatId = update.message.chat.id;
    const shop = update.message.text.split(' ')[1] || process.env.SHOP_NAME || 'buildyou';
    
    // Send invoice for 29 CAD via Stars (Telegram handles conversion)
    // For Stars, price in Stars: 29 CAD ~ 2500 Stars (adjust)
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        title: `StitchDesk — ${shop} — 1 Week Free Then $29/mo CAD`,
        description: `Agentic RAG living upholstery library + AI receptionist. First week free, then $29 CAD/mo. No purple. Just ship.`,
        payload: `stitchdesk_${shop}_${Date.now()}`,
        currency: 'XTR',
        prices: [{ label: 'StitchDesk Monthly', amount: 1050 }], // Stars: ~1050 Stars ≈ $29 CAD — VERIFY against live Star pack prices before first charge
        start_parameter: 'stitchdesk_pay'
      })
    }).catch(async () => {
      // Fallback if Stars not enabled — send manual instructions
      await sendMessage(chatId, `🟢 <b>BuildYou StitchDesk — Activate $0 Today</b>

Shop: ${shop}

<b>Pay $29 CAD/mo:</b>
1️⃣ Stars: This bot will support Stars soon — for now use e-Transfer
2️⃣ e-Transfer: Send $29 CAD to <code>forcebuildyou@gmail.com</code>
Message: StitchDesk + ${shop}

Reply with screenshot after payment and I'll issue your forwarding number + live link: https://stitch-desk-sage.vercel.app/?ref=${shop}

Agentic RAG library growing — foam, tufting, yardage, pricing. Value increases with time.`);
    });
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

Your StitchDesk is activating!

Live link: https://stitch-desk-sage.vercel.app/?ref=${process.env.SHOP_NAME || 'buildyou'}

Forwarding number will be issued in 2 hours. Reply with your shop name + best call-forward number.

Welcome to the first living upholstery library. 🧵`);
    // TODO: Save to Supabase / issue Twilio number automatically
  }

  return res.status(200).send('ok');
}
