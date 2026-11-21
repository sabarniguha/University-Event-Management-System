// AI assistant for students, organisers and admins, powered by Groq. The key lives only in the server environment
// (GROQ_API_KEY). Without it the app works exactly as before and the assistant simply does not appear.
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { build, systemPrompt } = require('../utils/assistantContext');

const enabled = () => String(process.env.GROQ_API_KEY || '').trim().length > 0;
const model = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const URL = 'https://api.groq.com/openai/v1/chat/completions';

// A cap on total questions per day so a busy day cannot use up the Groq quota. Resets at midnight UTC.
let day = new Date().toISOString().slice(0, 10);
let used = 0;
const dailyLimit = () => Math.max(1, Number(process.env.ASSISTANT_DAILY_LIMIT) || 1000);
const takeDaily = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; used = 0; }
  if (used >= dailyLimit()) return false;
  used += 1;
  return true;
};

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1500) })).min(1).max(12),
}).refine((b) => b.messages[b.messages.length - 1].role === 'user', { message: 'The last message must come from the user' });

// GET /api/assistant/status
const status = asyncHandler(async (req, res) => { res.json({ enabled: enabled() }); });

// POST /api/assistant/chat  { messages: [{ role, content }] }
const chat = asyncHandler(async (req, res) => {
  if (!enabled()) throw new HttpError(503, 'The assistant has not been set up yet.');
  const { messages } = bodySchema.parse(req.body);
  if (!takeDaily()) throw new HttpError(429, 'The assistant has reached its limit for today. Please try again tomorrow.');

  const context = await build(req.user);
  let r;
  try {
    r = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
      body: JSON.stringify({ model: model(), temperature: 0.3, max_tokens: 700, messages: [{ role: 'system', content: systemPrompt(req.user, context) }, ...messages] }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    throw new HttpError(504, 'The assistant took too long to answer. Please try again.');
  }
  if (!r.ok) {
    // Never pass the provider's message (or the key) on to the browser.
    console.error(`[assistant] Groq answered ${r.status}`);
    throw new HttpError(r.status === 429 ? 429 : 502, r.status === 429 ? 'The assistant is busy. Please try again in a minute.' : 'The assistant could not answer right now.');
  }
  const data = await r.json().catch(() => null);
  const reply = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new HttpError(502, 'The assistant could not answer right now.');
  res.json({ reply });
});

module.exports = { status, chat, enabled };
