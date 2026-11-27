const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const ai = require('../utils/reportAi');

const enabled = () => String(process.env.GROQ_API_KEY || '').trim().length > 0;
const models = () => [...new Set([String(process.env.GROQ_MODEL || '').trim() || 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])];
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const askGroq = (model, messages) => fetch(URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
  body: JSON.stringify({ model, temperature: 0.3, max_tokens: 1200, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), messages }),
  signal: AbortSignal.timeout(25000),
});

const body = z.object({ kind: z.enum(['platform', 'organiser', 'event', 'student']), data: z.record(z.any()) });

// POST /api/report-ai  { kind, data }  -> { source: 'ai' | 'basic', bullets: [..] }
// `data` is the report the person is already looking at; it is shrunk to numbers first (no names, emails or IDs).
const insights = asyncHandler(async (req, res) => {
  const { kind, data } = body.parse(req.body);
  if (!ai.KINDS[kind].roles.includes(req.user.role)) throw new HttpError(403, 'Not allowed for this report');
  if (!enabled()) return res.json({ source: 'basic', bullets: ai.fallback(kind, data) });
  let r;
  try {
    for (const m of models()) {
      // eslint-disable-next-line no-await-in-loop
      r = await askGroq(m, ai.prompt(kind, data));
      if (r.ok || ![400, 404, 410].includes(r.status)) break;
    }
  } catch (e) {
    return res.json({ source: 'basic', bullets: ai.fallback(kind, data) });
  }
  if (!r.ok) {
    console.error(`[report-ai] Groq answered ${r.status}`);
    return res.json({ source: 'basic', bullets: ai.fallback(kind, data) });
  }
  const j = await r.json().catch(() => null);
  const bullets = ai.toBullets(j?.choices?.[0]?.message?.content);
  res.json(bullets.length ? { source: 'ai', bullets } : { source: 'basic', bullets: ai.fallback(kind, data) });
});

module.exports = { insights };
