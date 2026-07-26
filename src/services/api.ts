import type { Question } from '../types';

const API_KEY = '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';

function getApiUrl(): string {
  if (import.meta.env.DEV) {
    return '/api/nvidia/chat/completions';
  }
  return '/api/generate';
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (import.meta.env.DEV) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  return headers;
}

async function callAI(prompt: string): Promise<string> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseQuestions(raw: string): Question[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in AI response');

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty or invalid array');
    }

    return parsed.map((q: any, i: number) => {
      const imageQuery = q.imageQuery || q.image_query || q.imageUrl || '';
      return {
        id: `ai-${Date.now()}-${i}`,
        question: q.question || q.Q || `Question ${i + 1}`,
        type: normalizeType(q.type || q.QuestionType || 'MCQ'),
        options: normalizeOptions(q.options || q.choices || null, q.type || 'MCQ'),
        correctAnswer: q.correctAnswer || q.correct_answer || q.answer || '',
        explanation: q.explanation || q.rationale || '',
        difficulty: normalizeDifficulty(q.difficulty || 'medium'),
        subject: q.subject || '',
        topic: q.topic || '',
        imageQuery,
      };
    });
  } catch (err: any) {
    console.error('Parse error:', err.message);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

function normalizeType(type: string): Question['type'] {
  const t = String(type).toLowerCase();
  if (t.includes('mcq') || t.includes('multiple') || t.includes('choice')) return 'MCQ';
  if (t.includes('true') || t.includes('false')) return 'TrueFalse';
  if (t.includes('theory') || t.includes('open') || t.includes('explain')) return 'Theory';
  if (t.includes('fill') || t.includes('blank')) return 'FillBlank';
  return 'MCQ';
}

function normalizeDifficulty(d: string): Question['difficulty'] {
  const dl = String(d).toLowerCase();
  if (dl.includes('easy') || dl.includes('simple')) return 'easy';
  if (dl.includes('hard') || dl.includes('difficult')) return 'hard';
  return 'medium';
}

function normalizeOptions(options: any, type: string): string[] | undefined {
  if (type === 'TrueFalse' || type === 'trueFalse') return ['True', 'False'];
  if (!options || !Array.isArray(options)) return undefined;
  return options.map((o: any) => {
    if (typeof o === 'string') return o;
    if (o.text) return o.text;
    if (o.label) return o.label;
    return String(o);
  });
}

export async function generateQuestions(params: {
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  count: number;
}): Promise<{ questions: Question[] }> {
  const typeMap: Record<string, string> = {
    MCQ: 'multiple choice with 4 options',
    Theory: 'open-ended theory questions',
    Fill: 'fill-in-the-blank questions',
    True: 'true or false questions',
    Matching: 'multiple choice with 4 options',
    Mixed: 'a mix of MCQ, theory, and true/false',
  };

  const questionFormat = typeMap[params.questionType] || typeMap['MCQ'];

  const prompt = `Generate exactly ${params.count} exam questions about "${params.topic}" for ${params.sector} at ${params.level} level.
Format: ${questionFormat}

Return ONLY a JSON array. Each object:
{"question":"...","type":"MCQ|Theory|TrueFalse|FillBlank","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A. ...","explanation":"...","difficulty":"easy|medium|hard","subject":"${params.sector}","topic":"${params.topic}","imageQuery":"1-3 word search term for an image that illustrates this concept"}

For TrueFalse: options=["True","False"], correctAnswer="True" or "False".
For Theory: options can be omitted, correctAnswer is a model answer.
The imageQuery should be a short search phrase (1-3 words) relevant to the concept being tested, suitable for finding an educational illustration. E.g. "abstract noun", "water cycle diagram", "Python loop".
No markdown. No text outside the JSON array.`;

  const raw = await callAI(prompt);
  const questions = parseQuestions(raw);

  if (questions.length === 0) {
    throw new Error('No questions were generated. Please try again.');
  }

  return { questions };
}

export async function getDeepExplanation(params: {
  question: string;
  correctAnswer: string;
  explanation: string;
  subject: string;
}): Promise<string> {
  const prompt = `You are a helpful tutor. A student got this exam question wrong and needs a deeper explanation.

Question: ${params.question}
Correct Answer: ${params.correctAnswer}
Brief explanation: ${params.explanation}
Subject: ${params.subject}

Provide a detailed, easy-to-understand explanation (2-4 paragraphs) that:
1. Explains WHY the correct answer is right
2. Explains why common wrong answers are wrong
3. Gives real-world examples or analogies
4. Mentions related concepts the student should also know

Write in plain text, no markdown formatting.`;

  return await callAI(prompt);
}
