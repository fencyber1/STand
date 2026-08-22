const API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

const MODEL = 'meta/llama-3.1-8b-instruct';
const TIMEOUT_MS = 45000;

function safeParseJSON(text: string): any {
  let cleanText = text.trim();
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

async function callAIStream(prompt: string, systemPrompt: string, maxTokens: number, onChunk?: (chunk: string) => void): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        top_p: 0.9,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA API error: ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk?.(delta);
            }
          } catch {}
        }
      }
    }

    return fullContent;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('NVIDIA API timed out after 45s');
    }
    throw err;
  }
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

const REQUIRED_FIELDS = Object.keys(DEFAULTS);

function applyDefaults(parsed: any): any {
  const result = { ...parsed };
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result) || result[field] === null || result[field] === undefined) {
      result[field] = DEFAULTS[field as keyof typeof DEFAULTS];
    }
  }
  // Ensure lesson is object
  if (!result.lesson || typeof result.lesson !== 'object') {
    result.lesson = { simple: '', detailed: '' };
  }
  return result;
}

// Core sections - generated first (fast)
const CORE_SECTIONS = ['introduction', 'learningObjectives', 'keyTerminology', 'lesson'];

const EXTENDED_SECTIONS = [
  'simpleExplanation', 'advancedExplanation', 'examples',
  'realWorldApplications', 'caseStudies', 'interactiveActivities',
  'knowledgeChecks', 'practiceQuestions', 'revisionNotes', 'summary', 'additionalResources'
];

function buildCorePrompt(topicTitle: string, sourceText: string, options: any): string {
  const difficulty = options?.difficulty ?? 'beginner';
  const audience = options?.targetAudience ?? 'nursing students';
  const instructions = options?.customInstructions ?? '';
  const context = sourceText || topicTitle;

  return `
You are an expert educational content creator. Generate ONLY the CORE sections of a topic.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${context.substring(0, 4000)}

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

function buildExtendedPrompt(topicTitle: string, sourceText: string, options: any, coreContent: any): string {
  const difficulty = options?.difficulty ?? 'beginner';
  const audience = options?.targetAudience ?? 'nursing students';
  const instructions = options?.customInstructions ?? '';
  const context = sourceText || topicTitle;

  return `
You are an expert educational content creator. Generate EXTENDED sections for a topic.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${context.substring(0, 4000)}

CORE CONTENT ALREADY GENERATED (for context, do not repeat):
- Introduction: ${coreContent.introduction?.substring(0, 200)}...
- Learning Objectives: ${coreContent.learningObjectives?.slice(0, 3).join('; ')}...
- Lesson (simple): ${coreContent.lesson?.simple?.substring(0, 200)}...

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

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '';
  const allowedOrigins = ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('.vercel.app');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!API_KEY) return res.status(500).json({ error: 'NVIDIA_API_KEY not set in Vercel env vars.' });

  const { topicTitle, sourceText, difficulty, targetAudience, customInstructions, progressive } = req.body;
  if (!topicTitle) return res.status(400).json({ error: 'topicTitle is required' });

  // If progressive mode requested, use SSE to stream partial results
  if (progressive) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const sendError = (error: string) => {
      send({ error });
      res.end();
    };

    try {
      // Phase 1: Core sections
      send({ phase: 'core', progress: 10, message: 'Generating core content...' });
      
      const corePrompt = buildCorePrompt(topicTitle, sourceText || '', { difficulty, targetAudience, customInstructions });
      let coreContent = '';
      
      try {
        coreContent = await callAIStream(
          corePrompt,
          'You are an expert educational content creator. Output only valid JSON with the exact fields requested. No markdown.',
          4096,
          (chunk) => {
            // Could stream partial core content if needed
          }
        );
      } catch (err: any) {
        return sendError(`Core generation failed: ${err.message}`);
      }

      const coreParsed = safeParseJSON(coreContent);
      if (!coreParsed) return sendError('Failed to parse core content');
      
      const coreWithDefaults = applyDefaults({ ...coreParsed, ...DEFAULTS });
      send({ phase: 'core', progress: 40, data: coreWithDefaults, message: 'Core content ready' });

      // Phase 2: Extended sections (generate in parallel batches)
      send({ phase: 'extended', progress: 50, message: 'Generating detailed content...' });

      const extendedPrompt = buildExtendedPrompt(topicTitle, sourceText || '', { difficulty, targetAudience, customInstructions }, coreWithDefaults);
      
      let extendedContent = '';
      try {
        extendedContent = await callAIStream(
          extendedPrompt,
          'You are an expert educational content creator. Output only valid JSON with the exact fields requested. No markdown.',
          6144,
          (chunk) => {
            // Could stream partial extended content
          }
        );
      } catch (err: any) {
        // Return what we have so far
        return send({ phase: 'complete', progress: 100, data: coreWithDefaults, message: 'Extended generation failed, returning core content' });
      }

      const extendedParsed = safeParseJSON(extendedContent);
      if (!extendedParsed) {
        return send({ phase: 'complete', progress: 100, data: coreWithDefaults, message: 'Extended parse failed, returning core content' });
      }

      const merged = { ...coreWithDefaults, ...extendedParsed };
      const finalResult = applyDefaults(merged);
      
      send({ phase: 'complete', progress: 100, data: finalResult, message: 'Generation complete' });
    } catch (err: any) {
      sendError(err.message || 'Generation failed');
    } finally {
      res.end();
    }
    return;
  }

  // Non-progressive (original) mode - single call
  const prompt = buildCorePrompt(topicTitle, sourceText || '', { difficulty, targetAudience, customInstructions }) + '\n\n' + 
    'Also include all extended sections: simpleExplanation, advancedExplanation, examples, realWorldApplications, caseStudies, interactiveActivities, knowledgeChecks, practiceQuestions, revisionNotes, summary, additionalResources.';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an expert educational content creator. Output only valid JSON matching the full schema. No markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 8192,
        top_p: 0.9,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `NVIDIA API error: ${errText}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: 'No content returned from NVIDIA API' });

    const parsed = safeParseJSON(content);
    if (!parsed) return res.status(500).json({ error: 'Failed to parse AI response as JSON' });

    const finalResult = applyDefaults(parsed);
    return res.status(200).json(finalResult);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'NVIDIA API timed out after 90s' });
    }
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}