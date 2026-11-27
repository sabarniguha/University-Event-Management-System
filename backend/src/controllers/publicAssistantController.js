const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { build, systemPrompt } = require('../utils/publicAssistantContext');

// Home-page assistant for visitors (no sign-in). Same Groq key as the signed-in assistant; without it the widget simply does not show.
const enabled = () => String(process.env.GROQ_API_KEY || '').trim().length > 0;
const models = () => [...new Set([String(process.env.GROQ_MODEL || '').trim() || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])];
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const askGroq = (model, messages) => fetch(URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
  body: JSON.stringify({ model, temperature: 0.3, max_tokens: 1000, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), messages }),
  signal: AbortSignal.timeout(25000),
});

// Anyone can call this, so the whole site shares a modest daily budget (resets at midnight UTC).
let day = new Date().toISOString().slice(0, 10);
let used = 0;
const dailyLimit = () => Math.max(1, Number(process.env.PUBLIC_ASSISTANT_DAILY_LIMIT) || 300);
const takeDaily = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; used = 0; }
  if (used >= dailyLimit()) return false;
  used += 1;
  return true;
};

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(800) })).min(1).max(8),
}).refine((b) => b.messages[b.messages.length - 1].role === 'user', { message: 'The last message must come from the visitor' });

const status = asyncHandler(async (req, res) => { res.json({ enabled: enabled() }); });

const chat = asyncHandler(async (req, res) => {
  if (!enabled()) throw new HttpError(503, 'The assistant has not been set up yet.');
  const { messages } = bodySchema.parse(req.body);
  if (!takeDaily()) throw new HttpError(429, 'The assistant has reached its limit for today. Please try again tomorrow.');
  const convo = [{ role: 'system', content: systemPrompt(await build()) }, ...messages];
  let r;
  try {
    for (const m of models()) {
      // eslint-disable-next-line no-await-in-loop
      r = await askGroq(m, convo);
      if (r.ok || ![400, 404, 410].includes(r.status)) break;
    }
  } catch (e) {
    throw new HttpError(504, 'The assistant took too long to answer. Please try again.');
  }
  if (!r.ok) {
    console.error(`[public-assistant] Groq answered ${r.status}`);
    throw new HttpError(r.status === 429 ? 429 : 502, r.status === 429 ? 'The assistant is busy. Please try again in a minute.' : 'The assistant could not answer right now.');
  }
  const data = await r.json().catch(() => null);
  const reply = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new HttpError(502, 'The assistant could not answer right now.');
  res.json({ reply });
});

module.exports = { status, chat };
