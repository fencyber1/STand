import type { Question } from '../types';

const API_KEY = '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';
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-8b-instruct';

async function callAI(prompt: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseQuestions(raw: string): Question[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((q: any, i: number) => ({
      id: `ai-${Date.now()}-${i}`,
      question: q.question || `Question ${i + 1}`,
      type: (q.type as Question['type']) || 'MCQ',
      options: q.options || undefined,
      correctAnswer: q.correctAnswer || q.correct_answer || '',
      explanation: q.explanation || '',
      difficulty: (q.difficulty as Question['difficulty']) || 'medium',
      subject: q.subject || '',
      topic: q.topic || '',
    }));
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

export async function generateQuestions(params: {
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  count: number;
}): Promise<{ questions: Question[] }> {
  const typeMap: Record<string, string> = {
    MCQ: 'multiple choice with 4 options (A, B, C, D)',
    Theory: 'open-ended theory questions requiring written explanations',
    Fill: 'fill-in-the-blank questions',
    True: 'true or false questions',
    Matching: 'multiple choice with 4 options',
    Mixed: 'a mix of multiple choice, theory, and true/false questions',
  };

  const questionFormat = typeMap[params.questionType] || typeMap['MCQ'];

  const prompt = `You are an expert exam question writer for ${params.sector} at the ${params.level} education level.

Generate exactly ${params.count} exam questions about "${params.topic}".

Format: ${questionFormat}

Return ONLY a valid JSON array (no markdown, no explanation outside the array). Each object must have exactly these fields:
- "question": the question text
- "type": one of "MCQ", "Theory", "TrueFalse", "FillBlank"
- "options": array of 4 strings for MCQ (e.g. ["A. ...", "B. ...", "C. ...", "D. ..."]), or ["True", "False"] for TrueFalse, or null/omit for Theory/FillBlank
- "correctAnswer": the correct answer string (for MCQ use the full correct option text like "A. answer text")
- "explanation": a clear explanation of why the answer is correct
- "difficulty": one of "easy", "medium", "hard"
- "subject": "${params.sector}"
- "topic": "${params.topic}"

Make the questions challenging, accurate, and educational. Ensure the correctAnswer matches one of the options exactly for MCQ questions.

Return ONLY the JSON array, nothing else.`;

  const raw = await callAI(prompt);
  const questions = parseQuestions(raw);

  if (questions.length === 0) {
    throw new Error('No questions were generated. Please try again.');
  }

  return { questions };
}
