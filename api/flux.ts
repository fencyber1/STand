const FLUX_API_KEY = process.env.FLUX_API_KEY || '';
const FLUX_API = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!FLUX_API_KEY) return res.status(500).json({ error: 'FLUX_API_KEY not set in Vercel env vars.' });

  try {
    const { prompt, width = 1024, height = 1024, steps = 40, cfg_scale = 3.5, seed = 0 } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const response = await fetch(FLUX_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLUX_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        steps,
        cfg_scale,
        seed,
      }),
    });

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'FLUX proxy error' });
  }
}
