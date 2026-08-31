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

const API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'groq/compound-mini';

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
    return res.end(JSON.stringify({ error: 'GROQ_API_KEY not set. Create .env file with GROQ_API_KEY=your_key' }));
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
  const wantsStream = parsed.stream === true;

  try {
    const response = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: parsed.messages,
        temperature,
        max_tokens: maxTokens,
        stream: wantsStream,
      }),
    });

    if (wantsStream && response.body) {
      res.writeHead(response.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Stream interrupted
      }
      return res.end();
    }

    const text = await response.text();
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    return res.end(text);
  } catch (err) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: (err instanceof Error ? err.message : 'Proxy error') || 'Proxy error' }));
  }
});

const PORT = Number(process.env.PORT) || 4200;
server.listen(PORT, () => {
  console.log(`API proxy server running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set. Create .env file with your key.');
  } else {
    console.log('✅ GROQ_API_KEY loaded, model=' + MODEL);
  }
});
