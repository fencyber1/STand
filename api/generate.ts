const API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '';
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('.vercel.app');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!API_KEY) return res.status(500).json({ error: 'NVIDIA_API_KEY not set in Vercel env vars.' });

  // Validate and constrain inputs
  const maxTokens = Math.min(Number(req.body.max_tokens) || 4096, 8192);
  const temperature = Math.min(Math.max(Number(req.body.temperature) || 0.7, 0), 2);
  const allowedModels = ['meta/llama-3.1-8b-instruct'];
  const model = allowedModels.includes(req.body.model) ? req.body.model : 'meta/llama-3.1-8b-instruct';

  const wantsStream = req.body.stream === true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(NVIDIA_API, {
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
      return res.status(504).json({ error: 'NVIDIA API timed out after 45s' });
    }
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
