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

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// AI provider switch: AI_PROVIDER=gemini (default) or groq. Both use an
// OpenAI-compatible chat-completions API with Bearer auth.
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const API_KEY = PROVIDER === 'groq'
  ? (process.env.GROQ_API_KEY || '')
  : (process.env.GEMINI_API_KEY || '');
const API_URL = PROVIDER === 'groq' ? GROQ_API : GEMINI_API;
const MODEL = PROVIDER === 'groq'
  ? (process.env.GROQ_MODEL || 'qwen/qwen3.8-27b')
  : (process.env.GEMINI_MODEL || 'gemini-3.6-flash');
// Long structured topic generation uses the lite model (reliable under load)
const MODEL_CLASSROOM = PROVIDER === 'groq'
  ? (process.env.GROQ_MODEL_CLASSROOM || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b')
  : (process.env.GEMINI_MODEL_CLASSROOM || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest');
const KEY_NAME = PROVIDER === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';
// Client may request a chat model per mode; only these are honored.
const ALLOWED_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
]);

function safeParseJSON(text) {
  let cleanText = String(text || '').trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  try {
    return JSON.parse(cleanText);
  } catch {
    return null;
  }
}

async function callGroqJSON(systemPrompt, userPrompt, maxTokens) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_CLASSROOM,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      top_p: 0.9,
      stream: false,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content
    ?? data.choices?.[0]?.message?.reasoning
    ?? '';
  const parsed = safeParseJSON(content);
  if (!parsed) throw new Error('Failed to parse AI response as JSON');
  return parsed;
}

const DEFAULTS = {
  introduction: '',
  learningObjectives: [],
  keyTerminology: [],
  lesson: { simple: '', detailed: '' },
  simpleExplanation: '',
  advancedExplanation: '',
  examples: [],
  realWorldApplications: [],
  caseStudies: [],
  interactiveActivities: [],
  knowledgeChecks: [],
  practiceQuestions: [],
  revisionNotes: '',
  summary: '',
  additionalResources: [],
};

function applyDefaults(parsed) {
  const result = { ...(parsed || {}) };
  for (const field of Object.keys(DEFAULTS)) {
    if (!(field in result) || result[field] === null || result[field] === undefined) {
      result[field] = DEFAULTS[field];
    }
  }
  if (!result.lesson || typeof result.lesson !== 'object') {
    result.lesson = { simple: '', detailed: '' };
  }
  return result;
}

function buildCorePrompt(topicTitle, sourceText, options) {
  const difficulty = options?.difficulty ?? 'beginner';
  const audience = options?.targetAudience ?? 'students';
  const instructions = options?.customInstructions ?? '';
  const context = sourceText || topicTitle;
  return `You are an expert educational content creator. Generate ONLY the CORE sections of a topic.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${String(context).substring(0, 4000)}

Generate valid JSON with ONLY these fields:
{
  "introduction": "Compelling opening introducing the topic and its importance (2-3 paragraphs)",
  "learningObjectives": ["5-7 specific, measurable learning objectives"],
  "keyTerminology": [{"term": "Term name", "definition": "Clear definition"}],
  "lesson": {
    "simple": "Beginner-friendly explanation using analogies and clear language (3-4 paragraphs)",
    "detailed": "Comprehensive technical explanation with depth (5-7 paragraphs)"
  }
}

Return ONLY valid JSON. No markdown. No extra fields.`;
}

function buildExtendedPrompt(topicTitle, sourceText, options, coreContent) {
  const difficulty = options?.difficulty ?? 'beginner';
  const audience = options?.targetAudience ?? 'students';
  const instructions = options?.customInstructions ?? '';
  const context = sourceText || topicTitle;
  return `You are an expert educational content creator. Generate EXTENDED sections for a topic.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${String(context).substring(0, 4000)}

CORE CONTENT ALREADY GENERATED (for context, do not repeat):
- Introduction: ${(coreContent.introduction || '').substring(0, 200)}...
- Learning Objectives: ${(coreContent.learningObjectives || []).slice(0, 3).join('; ')}...
- Lesson (simple): ${((coreContent.lesson || {}).simple || '').substring(0, 200)}...

Generate valid JSON with ONLY these fields:
{
  "simpleExplanation": "Even simpler version for struggling students - very basic language (2 paragraphs)",
  "advancedExplanation": "Advanced explanation for high-performing students - technical and detailed (3 paragraphs)",
  "examples": [{"title": "Example name", "description": "Detailed example", "type": "basic|intermediate|advanced"}],
  "realWorldApplications": ["3-5 real-world applications"],
  "caseStudies": [{"id": "cs1", "title": "Case study title", "scenario": "Detailed scenario", "questions": ["Q1", "Q2"], "learningOutcomes": ["Outcome"]}],
  "interactiveActivities": [{"id": "act1", "type": "drag_drop|matching|simulation|quiz", "title": "Activity title", "content": {"instructions": "How to do it", "items": []}}],
  "knowledgeChecks": [{"id": "kc1", "question": "Question", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Why correct", "difficulty": "easy|medium|hard"}],
  "practiceQuestions": [{"id": "pq1", "text": "Practice question", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Explanation", "difficulty": "easy|medium|hard"}],
  "revisionNotes": "Key points for quick revision - bullet format",
  "summary": "Concise summary of entire topic (1-2 paragraphs)",
  "additionalResources": [{"title": "Resource name", "url": "https://...", "type": "article|video|document|link"}]
}

Return ONLY valid JSON. No markdown. No extra fields. Include ALL fields listed.`;
}

const SYS_JSON = 'You are an expert educational content creator. Output only valid JSON with the exact fields requested. No markdown.';

async function handleGenerate(req, res, parsed) {
  const maxTokens = Math.min(Number(parsed.max_tokens) || 4096, 8192);
  const temperature = Math.min(Math.max(Number(parsed.temperature) || 0.7, 0), 2);
  const wantsStream = parsed.stream === true;
  const model = (typeof parsed.model === 'string' && ALLOWED_MODELS.has(parsed.model))
    ? parsed.model
    : MODEL;

  const response = await fetch(API_URL, {
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
}

async function handleClassroomGenerate(req, res, parsed) {
  const { topicTitle, sourceText, difficulty, targetAudience, customInstructions, progressive } = parsed;
  if (!topicTitle) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'topicTitle is required' }));
  }
  const options = { difficulty, targetAudience, customInstructions };

  if (progressive) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
      send({ phase: 'core', progress: 10, message: 'Generating core content...' });
      let coreParsed;
      try {
        coreParsed = await callGroqJSON(SYS_JSON, buildCorePrompt(topicTitle, sourceText || '', options), 4096);
      } catch (err) {
        send({ error: `Core generation failed: ${err.message}` });
        return res.end();
      }
      const coreWithDefaults = applyDefaults({ ...DEFAULTS, ...coreParsed });
      send({ phase: 'core', progress: 40, data: coreWithDefaults, message: 'Core content ready' });
      send({ phase: 'extended', progress: 50, message: 'Generating detailed content...' });
      try {
        const extendedParsed = await callGroqJSON(
          SYS_JSON,
          buildExtendedPrompt(topicTitle, sourceText || '', options, coreWithDefaults),
          6144
        );
        const finalResult = applyDefaults({ ...coreWithDefaults, ...extendedParsed });
        send({ phase: 'complete', progress: 100, data: finalResult, message: 'Generation complete' });
      } catch {
        send({ phase: 'complete', progress: 100, data: coreWithDefaults, message: 'Extended generation failed, returning core content' });
      }
    } catch (err) {
      send({ error: err.message || 'Generation failed' });
    }
    return res.end();
  }

  // Non-progressive single call
  try {
    const coreParsed = await callGroqJSON(SYS_JSON, buildCorePrompt(topicTitle, sourceText || '', options), 4096);
    const finalResult = applyDefaults({ ...DEFAULTS, ...coreParsed });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(finalResult));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: err.message || 'Proxy error' }));
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const isGenerate = req.method === 'POST' && req.url === '/api/generate';
  const isClassroom = req.method === 'POST' && req.url === '/api/classroom-generate';
  if (!isGenerate && !isClassroom) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  if (!API_KEY) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: `${KEY_NAME} not set. Create .env file with ${KEY_NAME}=your_key` }));
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

  try {
    if (isClassroom) return await handleClassroomGenerate(req, res, parsed);
    return await handleGenerate(req, res, parsed);
  } catch (err) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: (err instanceof Error ? err.message : 'Proxy error') || 'Proxy error' }));
  }
});

const PORT = Number(process.env.PORT) || 4200;
server.listen(PORT, () => {
  console.log(`API proxy server running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn(`⚠️  ${KEY_NAME} not set. Create .env file with your key.`);
  } else {
    console.log(`✅ ${KEY_NAME} loaded, provider=${PROVIDER}, model=` + MODEL);
  }
});
