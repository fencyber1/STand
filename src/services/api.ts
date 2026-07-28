import type { Question } from '../types';

const API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';

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

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`AI API returned invalid response: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`AI API error (${response.status}): ${data.error || JSON.stringify(data)}`);
  }

  if (!data.choices || !data.choices[0]) {
    throw new Error(`AI API returned no choices: ${JSON.stringify(data).slice(0, 200)}`);
  }

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
  difficulty?: string;
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
  const difficultyLine = params.difficulty && params.difficulty !== 'all'
    ? `\nAll questions must be difficulty level: ${params.difficulty}.`
    : '';

  const prompt = `You are an exam question generator for the ${params.sector} course. Generate exactly ${params.count} exam questions.

STRICT RULES:
- Every question MUST be directly about the ${params.sector} subject. Do NOT include questions from any other subject or course.
- The topic is "${params.topic}" — all questions must relate to this topic WITHIN the ${params.sector} curriculum.
- The level is ${params.level} — questions must match this academic level.
- Each question's "subject" field MUST be exactly "${params.sector}".
- Do NOT generate questions about topics outside ${params.sector}, even if they seem related.
- EVERY question MUST include an "imageQuery" field — this is REQUIRED, not optional.
- The imageQuery MUST be a Wikipedia article title (e.g. "Mitosis", "Supply and demand", "Water cycle", "Python (programming language)") that has a relevant diagram or illustration.

Format: ${questionFormat}${difficultyLine}

Return ONLY a JSON array. Each object:
{"question":"...","type":"MCQ|Theory|TrueFalse|FillBlank","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A. ...","explanation":"...","difficulty":"easy|medium|hard","subject":"${params.sector}","topic":"${params.topic}","imageQuery":"exact Wikipedia article title for a related diagram"}

For TrueFalse: options=["True","False"], correctAnswer="True" or "False".
For Theory: options can be omitted, correctAnswer is a model answer.
The imageQuery is REQUIRED for every question. It MUST be a valid Wikipedia article title that has an image. Good examples: "Mitosis", "Photosynthesis", "Pythagorean theorem", "Supply and demand", "Newton's laws of motion", "Water cycle", "DNA".
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

export async function getTopicFunFact(topic: string, subject: string): Promise<string> {
  const prompt = `Give exactly ONE short, surprising, fun fact about "${topic}" in ${subject}. 
It should be something most people don't know — a "wow" moment. 
Write only the fact itself, 1-2 sentences max. No preamble, no "Did you know", no markdown.`;

  return await callAI(prompt);
}

export async function getDocumentQuestions(params: {
  documentText: string;
  questionCount: number;
  questionType: string;
  difficulty?: string;
}): Promise<{ questions: Question[] }> {
  const typeMap: Record<string, string> = {
    MCQ: 'multiple choice with 4 options (A, B, C, D)',
    Theory: 'open-ended theory questions requiring detailed answers',
    Fill: 'fill-in-the-blank questions with key terms removed',
    True: 'true or false questions',
    Mixed: 'a mix of MCQ, theory, and true/false',
  };

  const questionFormat = typeMap[params.questionType] || typeMap['MCQ'];
  const difficultyLine = params.difficulty && params.difficulty !== 'all'
    ? `\nAll questions must be difficulty level: ${params.difficulty}.`
    : '';

  const truncated = params.documentText.slice(0, 15000);

  const prompt = `You are an expert exam question generator. Your task is to generate exactly ${params.questionCount} high-quality exam questions based SOLELY on the uploaded document below.

CRITICAL RULES:
- Every single question MUST be directly about the specific content, facts, concepts, definitions, formulas, processes, or examples found in this document
- Questions must reference actual terms, names, numbers, dates, or details from the document — NOT generic/common-knowledge questions
- Do NOT ask vague questions like "What is X?" without tying it to a specific detail in the document
- If the document contains formulas, definitions, steps in a process, specific examples, or numerical data — generate questions that test knowledge of those exact details
- The correct answer for every question must be explicitly stated or clearly implied in the document text
- If the document covers a specific subject (e.g., biology, history, math), all questions must be about that subject's content as presented in the document

QUESTION FORMAT: ${questionFormat}
${difficultyLine}

DOCUMENT TEXT:
---
${truncated}
---

STEP 1: First, identify the main topic, subtopics, key terms, definitions, formulas, and important facts in the document.
STEP 2: Generate questions that test whether someone truly read and understood this specific document — not general knowledge.
STEP 3: Ensure every question can be answered correctly ONLY by someone who has read this document.

Return ONLY a JSON array. Each object must follow this exact structure:
{"question":"...","type":"MCQ|Theory|TrueFalse|FillBlank","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A. ...","explanation":"Explain why this answer is correct based on the document content","difficulty":"easy|medium|hard","subject":"Document-Based","topic":"[The actual subtopic from the document, e.g. 'Mitosis phases' or 'French Revolution causes']"}

For TrueFalse: options=["True","False"], correctAnswer="True" or "False".
For Theory: options can be omitted, correctAnswer is a detailed model answer.
For FillBlank: question should have a blank (___) where the answer goes, correctAnswer is the missing term.

No markdown formatting. No text outside the JSON array.`;

  const raw = await callAI(prompt);
  const questions = parseQuestions(raw);

  if (questions.length === 0) {
    throw new Error('No questions were generated from the document. Please try again.');
  }

  return { questions };
}
