import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const app = express();
const PORT = 3001;
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const API_KEY = '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';

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
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

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static build in production
try {
  const distPath = resolve('dist');
  const indexHtml = readFileSync(resolve(distPath, 'index.html'), 'utf-8');
  app.get('*', (req, res) => {
    res.type('html').send(indexHtml);
  });
} catch {}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
