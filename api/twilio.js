// api/twilio.js — StitchDesk Twilio Voice Webhook — BuildYou
// Drop this into Vercel project root /api/twilio.js
// Env: OPENAI_API_KEY, TWILIO_ACCOUNT_SID (optional verify), SUPABASE_URL, SUPABASE_KEY (optional), SHOP_NAME

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  // Twilio sends x-www-form-urlencoded
  const form = await new Promise(resolve => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(data))));
  });

  const speech = form.SpeechResult || '';
  const from = form.From || 'unknown';
  const callSid = form.CallSid || Date.now().toString();

  // White-label: every caller hears THEIR shop, never ours
  const shopName = process.env.SHOP_NAME || 'BuildYou Upholstery';
  
  // Agentic RAG system prompt — baked in, no external DB needed for MVP
  const systemPrompt = `You are Stitch — AI receptionist for ${shopName}.
  Voice: warm, fast, expert. Never mention BuildYou or any other business name.
  
  SHOP TYPES: Furniture, Auto, Marine, Cushions, Commercial, Headboards.
  Ask: What type of furniture? Dimensions? Fabric? Timeline?
  
  KNOWLEDGE (Agentic RAG seed):
  - Foam: 1.8 standard, 2.2 HD high-density, 2.8 luxury, HR foam best
  - Dacron: 3/4" wrap for softness, 1.5oz for cushions
  - Tufting: diamond/button, 4" spacing, needs extra yardage +20%
  - Yardage: Sofa ~14-18y, Chair ~6-8y, Headboard 72" ~5-7y velvet, add 15% for pattern match
  - Springs: 8-way hand-tied best, sinuous for mid, no-sag for commercial
  - Commercial: CA117, UFAC, 100k double rubs min
  - Auto/Marine: vinyl 32oz, UV resistant, mildew backing
  - Pricing 2024: Labour $95-145/hr, Sofa reupholst $1800-3200 + fabric
  
  FLOW:
  1. Greet: Thanks for calling ${shopName} — this is Stitch, your AI receptionist.
  2. Ask furniture type
  3. Get details, give ballpark, book calendar
  4. SMS recap
  
  Keep replies under 25 seconds. No filler.`;

  let reply = `Thanks for calling ${shopName} — this is Stitch, your AI receptionist. What type of furniture are we looking at — sofa, chair, commercial, headboard, auto, or marine?`;
  
  if (speech) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Caller (${from}) said: "${speech}". Previous was greeting if no speech. Respond as Stitch, ask next question, keep under 40 words.` }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });
      const data = await openaiRes.json();
      reply = data.choices?.[0]?.message?.content || reply;
    } catch (e) {
      console.error('OpenAI error', e);
      reply = `Got it — what type of furniture and approximate size? A sofa, chair, headboard, auto or marine?`;
    }

    // Optional: Save learning to Supabase (free tier) — grows library value
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/call_logs`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ from_phone: from, transcript: speech, stitch_reply: reply, call_sid: callSid, shop: process.env.SHOP_NAME || 'buildyou' })
        });
      } catch (err) {}
    }
  }

  // TwiML — agentic voice, gather next speech
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy-Neural" language="en-CA">${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Say>
  <Gather input="speech" action="/api/twilio" method="POST" language="en-CA" speechTimeout="2" timeout="5">
    <Say voice="Polly.Amy-Neural">I'm listening.</Say>
  </Gather>
  <Say voice="Polly.Amy-Neural">Thanks for calling ${shopName}. We'll text you a recap. Goodbye.</Say>
  <Hangup/>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}
