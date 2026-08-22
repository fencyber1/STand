const API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

function buildTopicPrompt(
  topicTitle: string,
  sourceText: string,
  options?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    targetAudience?: string;
    customInstructions?: string;
  }
): string {
  const difficulty = options?.difficulty ?? 'beginner';
  const audience = options?.targetAudience ?? 'nursing students';
  const instructions = options?.customInstructions ?? '';
  const context = sourceText || topicTitle;

  return `
You are an educational AI assistant specializing in creating comprehensive learning materials.

TOPIC: "${topicTitle}"
TARGET AUDIENCE: ${audience}
DIFFICULTY: ${difficulty}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}

SOURCE MATERIAL:
${context.substring(0, 6000)}

Generate a detailed JSON response with the following structure. Include ALL fields:

{
  "introduction": "A compelling opening that introduces the topic and its importance",
  "learningObjectives": ["List 5-7 specific, measurable learning objectives"],
  "keyTerminology": [
    {"term": "Term name", "definition": "Clear definition"}
  ],
  "lesson": {
    "simple": "Simple, beginner-friendly explanation using analogies and clear language",
    "detailed": "Detailed, comprehensive explanation with technical depth"
  },
  "simpleExplanation": "Even simpler version for struggling students - very basic language",
  "advancedExplanation": "Advanced explanation for high-performing students - technical and detailed",
  "examples": [
    {
      "title": "Example name",
      "description": "Detailed example",
      "type": "basic" | "intermediate" | "advanced"
    }
  ],
  "realWorldApplications": ["3-5 real-world applications of this topic"],
  "caseStudies": [
    {
      "id": "cs1",
      "title": "Case study title",
      "scenario": "Detailed scenario description",
      "questions": ["Question 1", "Question 2"],
      "learningOutcomes": ["What the student learns"]
    }
  ],
  "interactiveActivities": [
    {
      "id": "act1",
      "type": "drag_drop" | "matching" | "simulation" | "quiz",
      "title": "Activity title",
      "content": {"instructions": "How to do it", "items": []}
    }
  ],
  "knowledgeChecks": [
    {
      "id": "kc1",
      "question": "Knowledge check question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why this is correct",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "practiceQuestions": [
    {
      "id": "pq1",
      "text": "Practice question",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Explanation of the answer",
      "difficulty": "easy" | "medium" | "hard"
    }
  ],
  "revisionNotes": "Key points for quick revision - bullet format preferred",
  "summary": "Concise summary of the entire topic",
  "additionalResources": [
    {"title": "Resource name", "url": "https://...", "type": "article" | "video" | "document" | "link"}
  ]
}

Return ONLY valid JSON. Do not add any explanatory text.`;
}

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

  const { topicTitle, sourceText, difficulty, targetAudience, customInstructions } = req.body;
  if (!topicTitle) return res.status(400).json({ error: 'topicTitle is required' });

  const prompt = buildTopicPrompt(topicTitle, sourceText || '', { difficulty, targetAudience, customInstructions });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          { role: 'system', content: 'You are an expert educational content creator. Your output must always be valid JSON matching the requested schema exactly. Never add explanatory text outside the JSON.' },
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

    const requiredFields = [
      'introduction', 'learningObjectives', 'keyTerminology', 'lesson',
      'simpleExplanation', 'advancedExplanation', 'examples',
      'realWorldApplications', 'caseStudies', 'interactiveActivities',
      'knowledgeChecks', 'practiceQuestions', 'revisionNotes', 'summary',
      'additionalResources'
    ];

    const defaults: Record<string, any> = {
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

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        parsed[field] = defaults[field] ?? '';
      }
    }

    return res.status(200).json(parsed);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'NVIDIA API timed out after 60s' });
    }
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}