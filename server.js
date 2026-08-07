import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  } catch {}
}

loadEnv();

const API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/api/generate') {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  if (!API_KEY) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: 'NVIDIA_API_KEY not set. Create .env file with NVIDIA_API_KEY=your_key' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'Invalid JSON' }));
  }

  const maxTokens = Math.min(Number(parsed.max_tokens) || 4096, 8192);
  const temperature = Math.min(Math.max(Number(parsed.temperature) || 0.7, 0), 2);
  const model = 'meta/llama-3.1-8b-instruct';

  try {
    const response = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: parsed.messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    const text = await response.text();
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    return res.end(text);
  } catch (err: any) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: err.message || 'Proxy error' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`API proxy server running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('⚠️  NVIDIA_API_KEY not set. Create .env file with your key.');
  } else {
    console.log('✅ NVIDIA_API_KEY loaded');
  }
});
