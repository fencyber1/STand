const API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY is not set. Add it in Vercel dashboard → Settings → Environment Variables.' });
  }

  try {
    const response = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: req.body.messages,
        temperature: req.body.temperature || 0.7,
        max_tokens: req.body.max_tokens || 4096,
      }),
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: `NVIDIA API returned non-JSON: ${text.slice(0, 300)}` });
    }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
