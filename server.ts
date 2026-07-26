import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PORT = 3002;
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const API_KEY = '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';

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const parsed = JSON.parse(body);

      const response = await fetch(NVIDIA_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: parsed.messages,
          temperature: parsed.temperature || 0.7,
          max_tokens: parsed.max_tokens || 4096,
        }),
      });

      const data = await response.json();
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Serve static files in production
  if (req.url) {
    try {
      const filePath = resolve('dist', req.url === '/' ? 'index.html' : req.url);
      const content = readFileSync(filePath);
      const ext = req.url.split('.').pop() || 'html';
      const mime: Record<string, string> = { html: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json', svg: 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      // SPA fallback
      const html = readFileSync(resolve('dist', 'index.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
