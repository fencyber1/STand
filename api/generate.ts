const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// AI provider switch: AI_PROVIDER=gemini (default) or groq.
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const API_KEY = PROVIDER === 'groq'
  ? (process.env.GROQ_API_KEY || '')
  : (process.env.GEMINI_API_KEY || '');
const API_URL = PROVIDER === 'groq' ? GROQ_API : GEMINI_API;
const MODEL = PROVIDER === 'groq'
  ? (process.env.GROQ_MODEL || 'qwen/qwen3.8-27b')
  : (process.env.GEMINI_MODEL || 'gemini-3.6-flash');
const KEY_NAME = PROVIDER === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';
// Client may request a chat model per mode; only these are honored.
const ALLOWED_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
]);

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '';
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:4200'];
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('.vercel.app');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!API_KEY) return res.status(500).json({ error: `${KEY_NAME} not set in Vercel env vars.` });

  // Validate and constrain inputs
  const maxTokens = Math.min(Number(req.body.max_tokens) || 4096, 8192);
  const temperature = Math.min(Math.max(Number(req.body.temperature) || 0.7, 0), 2);
  const model = (typeof req.body.model === 'string' && ALLOWED_MODELS.has(req.body.model))
    ? req.body.model
    : MODEL;

  const wantsStream = req.body.stream === true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: req.body.messages,
        temperature,
        max_tokens: maxTokens,
        stream: wantsStream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (wantsStream && response.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          if (typeof (res as any).flush === 'function') (res as any).flush();
        }
      } catch {
        // Stream interrupted
      }

      return res.end();
    }

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI API timed out after 35s' });
    }
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
