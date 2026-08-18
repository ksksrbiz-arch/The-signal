// Minimal multi-provider LLM client for the content agents.
//
// Groq and Gemini are both used on their free tiers, so the design assumes
// rate limits are the normal case rather than an exception: every call retries
// with backoff on 429/5xx, and the caller can fall back to the other provider.
//
// Model IDs are read from env so a deprecated default can be corrected with a
// repo variable instead of a code change.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const MODELS = {
  groqLarge: process.env.GROQ_MODEL_LARGE || 'llama-3.3-70b-versatile',
  groqSmall: process.env.GROQ_MODEL_SMALL || 'llama-3.1-8b-instant',
  gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
};

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip provider keys out of anything we might log or throw. */
export function redact(value) {
  return String(value ?? '')
    .replace(/(?:gsk|sk|AIza)[A-Za-z0-9_\-]{10,}/g, '[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [redacted]')
    .slice(0, 600);
}

async function requestWithRetry(url, init, { attempts = 4, label = 'llm' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      lastError = new Error(`${label}: network error — ${redact(error?.message)}`);
      if (attempt === attempts) break;
      await sleep(2 ** attempt * 1000);
      continue;
    }

    if (response.ok) return response.json();

    const body = redact(await response.text().catch(() => ''));
    lastError = new Error(`${label}: HTTP ${response.status} — ${body}`);

    if (!RETRYABLE.has(response.status) || attempt === attempts) break;

    // Honour Retry-After when the provider sends one; otherwise exponential.
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
    await sleep(Math.min(waitMs, 60_000));
  }
  throw lastError;
}

export function hasGroq() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function hasGemini() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * @param {{system?: string, prompt: string, model?: string, temperature?: number,
 *          maxTokens?: number, json?: boolean}} options
 */
export async function groq({ system, prompt, model = MODELS.groqLarge, temperature = 0.7, maxTokens = 4096, json = false }) {
  if (!hasGroq()) throw new Error('groq: GROQ_API_KEY is not set');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  };

  const data = await requestWithRetry(
    GROQ_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    { label: `groq:${model}` },
  );

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`groq:${model}: empty completion`);
  return text.trim();
}

export async function gemini({ system, prompt, model = MODELS.gemini, temperature = 0.7, maxTokens = 4096, json = false }) {
  if (!hasGemini()) throw new Error('gemini: GEMINI_API_KEY is not set');

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };

  const data = await requestWithRetry(
    `${GEMINI_URL}/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { label: `gemini:${model}` },
  );

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ?? '';
  if (!text.trim()) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'unknown';
    throw new Error(`gemini:${model}: empty completion (finishReason: ${reason})`);
  }
  return text.trim();
}

/**
 * Try providers in order and return the first success. Used so a rate-limited
 * free tier on one provider does not fail the whole run.
 */
export async function complete(options, providers = ['groq', 'gemini']) {
  const errors = [];
  for (const name of providers) {
    if (name === 'groq' && !hasGroq()) continue;
    if (name === 'gemini' && !hasGemini()) continue;
    try {
      return name === 'groq' ? await groq(options) : await gemini(options);
    } catch (error) {
      errors.push(`${name}: ${redact(error?.message)}`);
    }
  }
  throw new Error(`all providers failed → ${errors.join(' | ') || 'no API keys configured'}`);
}

/** Parse a JSON object out of a completion, tolerating code fences. */
export function parseJsonBlock(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`could not locate a JSON object in the completion: ${redact(candidate.slice(0, 200))}`);
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
