import type { Question } from '../types';
import { storage } from './storage';

const MODEL = 'meta/llama-3.1-8b-instruct';

// Dev: Vite proxy (CORS handled, API key sent in headers)
// Prod: Vercel serverless function (CORS handled, API key from env var)
function getApiUrl(): string {
  if (import.meta.env.DEV) return '/v1/chat/completions';
  return '/api/generate';
}

const RAW_KEYS = import.meta.env.VITE_NVIDIA_API_KEY || '';
const API_KEYS = RAW_KEYS.split(',').map((k: string) => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

async function callAI(prompt: string): Promise<string> {
  // In dev mode, try each key. In production, serverless uses its own key.
  const keysToTry = import.meta.env.DEV && API_KEYS.length > 0
    ? Array.from({ length: API_KEYS.length }, (_, i) => API_KEYS[(currentKeyIndex + i) % API_KEYS.length])
    : [''];

  let lastError = '';

  for (const key of keysToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Only send API key in dev (prod serverless adds it from process.env)
      if (import.meta.env.DEV && key) {
        headers['Authorization'] = `Bearer ${key}`;
      }

      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await response.text();

      if (!response.ok) {
        lastError = `API error ${response.status}: ${text.slice(0, 200)}`;
        if (import.meta.env.DEV && (response.status === 429 || response.status >= 500)) {
          currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
          continue;
        }
        throw new Error(lastError);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
      }

      if (!data.choices || !data.choices[0]) {
        throw new Error(`AI returned no choices: ${JSON.stringify(data).slice(0, 200)}`);
      }

      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return data.choices[0].message.content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = 'AI service timed out. Please try again.';
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        continue;
      }
      throw err;
    }
  }

  throw new Error(lastError || 'API request failed. Please try again.');
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

// Global progress callback for batch generation
let progressCallback: ((current: number, total: number) => void) | null = null;

export function setQuestionProgressCallback(cb: ((current: number, total: number) => void) | null) {
  progressCallback = cb;
}

export async function generateQuestions(params: {
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  count: number;
  difficulty?: string;
  studentAge?: number;
  language?: string;
}): Promise<{ questions: Question[] }> {
  const BATCH_SIZE = 10;
  const totalNeeded = params.count;
  const allQuestions: Question[] = [];

  // Load previously generated questions for this topic to avoid repeats
  const topicKey = `${params.sector}__${params.topic}__${params.level}`.toLowerCase().slice(0, 120);
  const previousQuestions = storage.getGeneratedQuestionHistory(topicKey);
  const previousAsQuestions: Question[] = previousQuestions.map((q, i) => ({
    id: `hist-${i}`, question: q, type: 'MCQ', options: undefined,
    correctAnswer: '', explanation: '', difficulty: 'medium', subject: params.sector,
    topic: params.topic, imageQuery: '',
  }));

  for (let offset = 0; offset < totalNeeded; offset += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, totalNeeded - offset);
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalNeeded / BATCH_SIZE);

    progressCallback?.(offset, totalNeeded);

    const batchQuestions = await generateQuestionBatch(params, batchSize, batchNum, totalBatches, [...previousAsQuestions, ...allQuestions]);
    allQuestions.push(...batchQuestions);

    if (offset + BATCH_SIZE < totalNeeded) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  progressCallback?.(totalNeeded, totalNeeded);

  if (allQuestions.length === 0) {
    throw new Error('No questions were generated. Please try again.');
  }

  const final = allQuestions.slice(0, totalNeeded);

  // Save generated questions to history to prevent future repeats
  storage.saveGeneratedQuestionHistory(topicKey, final);

  return { questions: final };
}

async function generateQuestionBatch(
  params: {
    topic: string;
    sector: string;
    level: string;
    questionType: string;
    difficulty?: string;
    studentAge?: number;
    language?: string;
  },
  count: number,
  batchNum: number,
  totalBatches: number,
  existingQuestions: Question[],
): Promise<Question[]> {
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

  const ageLine = params.studentAge && params.level === 'PRIMARY/BASIC'
    ? `\nThe student is ${params.studentAge} years old (PRIMARY/BASIC level). Adjust accordingly:
- Use very simple, everyday language a ${params.studentAge}-year-old can understand
- Questions should be age-appropriate and relate to things a child this age would know
- Avoid complex terminology — use words and examples from daily life (family, school, animals, colors, numbers, simple science)
- MCQ options should be short and clear
- Explanations should be simple and encouraging
- Topics should match what a ${params.studentAge}-year-old is learning in school`
    : '';

  const langLine = params.language && params.language !== 'en'
    ? `\nThe user's language is ${params.language}. ALL questions, options, correctAnswer, and explanation MUST be written entirely in ${params.language}. Do NOT write in English.`
    : '';

  const avoidDuplicates = existingQuestions.length > 0
    ? `\n\n⚠️ ABSOLUTE PROHIBITION — DO NOT REPEAT QUESTIONS ⚠️
The following questions have ALREADY been generated. You MUST NOT generate any question that is the same as, similar to, or a rephrased version of ANY of these. Every single question you generate must be COMPLETELY NEW and UNIQUE.

PREVIOUSLY GENERATED QUESTIONS (DO NOT REPEAT):
${existingQuestions.map((q, i) => `${i + 1}. "${q.question.slice(0, 120)}"`).join('\n')}

VIOLATION RULE: If you generate ANY question that matches or closely resembles any question above, the entire output will be rejected. Generate ONLY entirely new, never-before-seen questions about different aspects of the topic.`
    : '';

  const prompt = `You are an exam question generator for the ${params.sector} course. Generate exactly ${count} exam questions (batch ${batchNum}/${totalBatches}).

STRICT RULES:
- Every question MUST be directly about the ${params.sector} subject.
- The topic is "${params.topic}" — all questions must relate to this topic WITHIN the ${params.sector} curriculum.
- The level is ${params.level} — questions must match this academic level.
- Each question's "subject" field MUST be exactly "${params.sector}".
- EVERY question MUST include an "imageQuery" field — this is REQUIRED.
- The imageQuery MUST be a Wikipedia article title that has a relevant diagram.
${avoidDuplicates}

CRITICAL QUESTION TYPE RULE:
You MUST generate ALL ${count} questions as EXACTLY this type: ${questionFormat.toUpperCase()}
${params.questionType === 'MCQ' ? 'EVERY question MUST have exactly 4 options (A, B, C, D). The "type" field MUST be "MCQ".' : ''}
${params.questionType === 'Theory' ? 'EVERY question MUST be open-ended with NO options. The "type" field MUST be "Theory".' : ''}
${params.questionType === 'True' ? 'EVERY question MUST be true/false with options=["True","False"]. The "type" field MUST be "TrueFalse".' : ''}
${params.questionType === 'Fill' ? 'EVERY question MUST have a blank (___). The "type" field MUST be "FillBlank".' : ''}
${params.questionType === 'Mixed' ? 'Generate a MIX of question types: some MCQ, some Theory, some TrueFalse.' : ''}
${difficultyLine}
${ageLine}
${langLine}

Return ONLY a JSON array. Each object:
{"question":"...","type":"MCQ|Theory|TrueFalse|FillBlank","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A. ...","explanation":"...","difficulty":"easy|medium|hard","subject":"${params.sector}","topic":"${params.topic}","imageQuery":"Wikipedia article title"}

No markdown. No text outside the JSON array.`;

  const raw = await callAI(prompt);
  return parseQuestions(raw);
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

export async function getMotivationalLines(userName: string, stats: { totalSessions: number; avgScore: number; streak: number }): Promise<string[]> {
  const prompt = `Generate exactly 10 short, unique motivational lines for a student named "${userName}" who has completed ${stats.totalSessions} practice sessions, averages ${stats.avgScore}% score, and has a ${stats.streak}-day streak.

Rules:
- Each line must be different in tone (encouraging, playful, confident, inspiring, warm)
- Reference their stats naturally when relevant (streak, score, sessions)
- Keep each line under 15 words
- No greetings, no emojis, no markdown, no quotation marks
- Return ONLY the 10 lines, one per line, nothing else`;

  const raw = await callAI(prompt);
  const lines = raw.split('\n').map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter((l) => l.length > 5);
  return lines.length >= 5 ? lines.slice(0, 10) : [
    "Every question brings you closer to mastery.",
    "Small steps lead to big results.",
    "Your consistency is building something great.",
    "Keep going — you're doing better than you think.",
    "Growth happens one practice at a time.",
  ];
}

export async function getDocumentQuestions(params: {
  documentText: string;
  questionCount: number;
  questionType: string;
  difficulty?: string;
  documentName?: string;
}): Promise<{ questions: Question[] }> {
  const BATCH_SIZE = 10;
  const totalNeeded = params.questionCount;
  const allQuestions: Question[] = [];

  // Load previously generated questions for this document
  const docKey = `doc__${(params.documentName || 'pasted').slice(0, 80)}`.toLowerCase();
  const previousQuestions = storage.getGeneratedQuestionHistory(docKey);
  const previousAsQuestions: Question[] = previousQuestions.map((q, i) => ({
    id: `hist-${i}`, question: q, type: 'MCQ', options: undefined,
    correctAnswer: '', explanation: '', difficulty: 'medium', subject: 'Document-Based',
    topic: '', imageQuery: '',
  }));

  for (let offset = 0; offset < totalNeeded; offset += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, totalNeeded - offset);
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalNeeded / BATCH_SIZE);

    progressCallback?.(offset, totalNeeded);

    const batchQuestions = await generateDocumentQuestionBatch(params, batchSize, batchNum, totalBatches, [...previousAsQuestions, ...allQuestions]);
    allQuestions.push(...batchQuestions);

    if (offset + BATCH_SIZE < totalNeeded) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  progressCallback?.(totalNeeded, totalNeeded);

  if (allQuestions.length === 0) {
    throw new Error('No questions were generated from the document. Please try again.');
  }

  const final = allQuestions.slice(0, totalNeeded);

  // Save generated questions to history
  storage.saveGeneratedQuestionHistory(docKey, final);

  return { questions: final };
}

async function generateDocumentQuestionBatch(
  params: {
    documentText: string;
    questionType: string;
    difficulty?: string;
  },
  count: number,
  batchNum: number,
  totalBatches: number,
  existingQuestions: Question[],
): Promise<Question[]> {
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

  const avoidDuplicates = existingQuestions.length > 0
    ? `\n\n⚠️ ABSOLUTE PROHIBITION — DO NOT REPEAT QUESTIONS ⚠️
The following questions have ALREADY been generated. You MUST NOT generate any question that is the same as, similar to, or a rephrased version of ANY of these. Every single question you generate must be COMPLETELY NEW and UNIQUE.

PREVIOUSLY GENERATED QUESTIONS (DO NOT REPEAT):
${existingQuestions.map((q, i) => `${i + 1}. "${q.question.slice(0, 120)}"`).join('\n')}

VIOLATION RULE: If you generate ANY question that matches or closely resembles any question above, the entire output will be rejected. Generate ONLY entirely new, never-before-seen questions about different aspects of the document.`
    : '';

  const prompt = `You are an expert exam question generator. Generate exactly ${count} questions based SOLELY on this document (batch ${batchNum}/${totalBatches}).

CRITICAL RULES:
- Every question MUST be directly about specific content in this document
- Questions must reference actual terms, names, numbers, or details from the document
- The correct answer must be explicitly stated or clearly implied in the document
${avoidDuplicates}

CRITICAL QUESTION TYPE RULE:
You MUST generate ALL ${count} questions as EXACTLY this type: ${questionFormat.toUpperCase()}
${params.questionType === 'MCQ' ? 'EVERY question MUST have exactly 4 options (A, B, C, D). The "type" field MUST be "MCQ".' : ''}
${params.questionType === 'Theory' ? 'EVERY question MUST be open-ended with NO options. The "type" field MUST be "Theory".' : ''}
${params.questionType === 'True' ? 'EVERY question MUST be true/false with options=["True","False"]. The "type" field MUST be "TrueFalse".' : ''}
${params.questionType === 'Fill' ? 'EVERY question MUST have a blank (___). The "type" field MUST be "FillBlank".' : ''}
${params.questionType === 'Mixed' ? 'Generate a MIX of question types.' : ''}
${difficultyLine}

DOCUMENT TEXT:
---
${truncated}
---

Return ONLY a JSON array. Each object:
{"question":"...","type":"MCQ|Theory|TrueFalse|FillBlank","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A. ...","explanation":"...","difficulty":"easy|medium|hard","subject":"Document-Based","topic":"[subtopic from document]"}

No markdown. No text outside the JSON array.`;

  const raw = await callAI(prompt);
  return parseQuestions(raw);
}

export async function gradeTheoryAnswer(params: {
  question: string;
  studentAnswer: string;
  modelAnswer: string;
  subject?: string;
  level?: string;
  difficulty?: string;
  totalMarks?: number;
}): Promise<{ score: number; feedback: string; tier1: number; tier2: number; tier3: number }> {
  const total = params.totalMarks || 100;
  const wordCount = params.studentAnswer.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount < 3) {
    return { score: 0, tier1: 0, tier2: 0, tier3: 0, feedback: 'Answer is too short to demonstrate any understanding.' };
  }

  const level = (params.level || '').toLowerCase();
  const difficulty = (params.difficulty || '').toLowerCase();
  const subject = params.subject || 'General';

  let strictness = '';

  if (level.includes('primary') || level.includes('basic')) {
    if (difficulty === 'easy') {
      strictness = `GRADING STRICTNESS: VERY LENIENT (PRIMARY/BASIC Level, Easy Difficulty)
- This is a very young student (primary school age). Be extremely encouraging and lenient.
- Reward ANY attempt to answer. Even a partially correct idea deserves generous marks.
- Accept simple, everyday language — this is a child. No technical terminology expected.
- If the student shows even basic awareness of the topic, give credit.
- A reasonable attempt in simple words should score at least ${Math.round(total * 0.5)}.
- Be warm and supportive in feedback. Encourage the child to keep learning.`;
    } else if (difficulty === 'hard') {
      strictness = `GRADING STRICTNESS: LENIENT (PRIMARY/BASIC Level, Hard Difficulty)
- This is a young student attempting a harder question. Be very encouraging.
- Reward effort and any correct ideas, even if incomplete.
- Simple language is perfectly fine — this is a child.
- Accept examples from everyday life.
- A good attempt should score well. Don't penalize heavily for being young.`;
    } else {
      strictness = `GRADING STRICTNESS: VERY LENIENT (PRIMARY/BASIC Level, Medium Difficulty)
- This is a young primary school student. Be encouraging and supportive.
- Accept simple language and everyday examples.
- If the student shows understanding of the basic concept, give good marks.
- Don't require precise definitions — this is a child learning.
- Warm, encouraging feedback is important.`;
    }
  } else if (level.includes('jss') || level.includes('bece')) {
    if (difficulty === 'easy') {
      strictness = `GRADING STRICTNESS: LENIENT (JSS/BECE Level, Easy Difficulty)
- This is a young student at a basic education level. Be encouraging and lenient.
- Reward effort and attempt to answer. Even a partial correct idea deserves marks.
- Accept simple, everyday language. Do NOT require technical terminology.
- Basic understanding of the concept is sufficient for full Tier 1 marks.
- Accept examples from everyday life, even if not academically precise.
- Critical analysis (Tier 3) is a bonus — don't heavily penalize its absence.
- A reasonable attempt in simple words should score at least ${Math.round(total * 0.3)}.`;
    } else if (difficulty === 'hard') {
      strictness = `GRADING STRICTNESS: MODERATE (JSS/BECE Level, Hard Difficulty)
- This is a basic-level student attempting a harder question. Be fair but expect more effort.
- Reward clear understanding of the core concept.
- Simple language is acceptable, but the answer should show the student tried to explain, not just guess.
- Basic use of relevant terms is a plus but not strictly required.
- Accept straightforward explanations without requiring deep analysis.`;
    } else {
      strictness = `GRADING STRICTNESS: MODERATE-LENIENT (JSS/BECE Level, Medium Difficulty)
- This is a basic-level student. Be fair and encouraging.
- Accept simple language. Reward understanding over terminology.
- A clear, correct basic explanation should score well.
- Don't penalize heavily for missing technical terms if the concept is understood.`;
    }
  } else if (level.includes('sss') || level.includes('waec') || level.includes('neco')) {
    if (difficulty === 'easy') {
      strictness = `GRADING STRICTNESS: MODERATE (Senior Secondary Level, Easy Difficulty)
- This is a secondary school student with foundational knowledge.
- Expect basic use of subject-specific terminology.
- The answer should demonstrate understanding beyond just everyday language.
- Accept explanations that show the student has studied the topic.
- Simple but correct explanations score well.
- Penalize answers that are clearly guessing or off-topic.`;
    } else if (difficulty === 'hard') {
      strictness = `GRADING STRICTNESS: STRICT (Senior Secondary Level, Hard Difficulty)
- This is a secondary school student attempting an advanced question.
- Expect clear use of technical terminology relevant to the subject.
- The answer should show the student can connect concepts.
- Vague or superficial answers should score low.
- Require specific examples or mechanisms, not just general statements.
- For ${subject}: expect subject-appropriate language and reasoning.`;
    } else {
      strictness = `GRADING STRICTNESS: MODERATE-STRICT (Senior Secondary Level, Medium Difficulty)
- Expect the student to use relevant terminology and explain concepts clearly.
- The answer should show understanding of mechanisms, not just definitions.
- Accept well-structured explanations that demonstrate study of the topic.
- Penalize vague or incomplete answers appropriately.`;
    }
  } else if (level.includes('university') || level.includes('jamb')) {
    if (difficulty === 'easy') {
      strictness = `GRADING STRICTNESS: STRICT (University Level, Easy Difficulty)
- This is a university student. Even for an easy question, expect university-level response.
- Require accurate use of technical terminology for ${subject}.
- The answer should be well-structured and precise.
- Acceptable: correct explanation with proper terms.
- Not acceptable: vague, casual, or superficial responses.
- Penalize lack of subject-specific language.`;
    } else if (difficulty === 'hard') {
      strictness = `GRADING STRICTNESS: VERY STRICT (University Level, Hard Difficulty)
- This is a university student attempting a challenging question. Hold them to the highest standard.
- REQUIRE precise technical terminology specific to ${subject}.
- REQUIRE detailed explanations of mechanisms, processes, or theories.
- REQUIRE critical analysis, connections between concepts, and evaluation.
- Vague answers = 0 for that tier. Superficial = minimal marks.
- Penalize heavily for: missing technical terms, lack of depth, no examples, generic responses.
- A good answer should demonstrate genuine understanding that could be applied to new contexts.
- For ${subject}: expect discipline-appropriate reasoning and evidence.`;
    } else {
      strictness = `GRADING STRICTNESS: STRICT (University Level, Medium Difficulty)
- Expect university-level response with proper technical terminology for ${subject}.
- The answer should demonstrate understanding of mechanisms and processes.
- Require specific examples or evidence, not just general statements.
- Penalize vague or incomplete explanations.
- The response should show the student has engaged with the material at depth.`;
    }
  } else if (level.includes('professional') || level.includes('certification')) {
    if (difficulty === 'hard') {
      strictness = `GRADING STRICTNESS: VERY STRICT (Professional/Certification Level, Hard Difficulty)
- This is a professional or certification candidate. Apply the strictest standards.
- REQUIRE expert-level terminology and precise technical language for ${subject}.
- REQUIRE detailed, practical knowledge with real-world application.
- REQUIRE critical evaluation and nuanced understanding.
- Vague or generic answers should score near 0.
- The answer should demonstrate professional competence, not just academic knowledge.
- For ${subject}: expect industry-standard terminology and practical reasoning.`;
    } else {
      strictness = `GRADING STRICTNESS: STRICT (Professional/Certification Level, ${difficulty === 'easy' ? 'Easy' : 'Medium'} Difficulty)
- Expect professional-level response with industry-appropriate terminology for ${subject}.
- The answer should demonstrate practical understanding, not just theoretical knowledge.
- Require specific, actionable knowledge where applicable.
- Penalize generic or textbook-only responses.`;
    }
  } else {
    strictness = `GRADING STRICTNESS: MODERATE-STRICT
- Expect a clear, well-explained answer with relevant terminology.
- The answer should demonstrate understanding of the core concept.
- Penalize vague or off-topic responses.`;
  }

  const prompt = `You are a strict expert exam grader. Grade this student's theory answer using a 3-tier rubric.

SUBJECT: ${subject}
EDUCATION LEVEL: ${params.level || 'Unknown'}
DIFFICULTY: ${params.difficulty || 'Medium'}

${strictness}

QUESTION: ${params.question}

MODEL ANSWER: ${params.modelAnswer}

STUDENT ANSWER: ${params.studentAnswer}

TOTAL MARKS AVAILABLE: ${total}

Grade using this rubric:

Tier 1 - Core Understanding (${Math.round(total * 0.4)} marks):
- Does the student understand the fundamental question?
- Are key definitions/concepts correctly identified?
- Is the explanation clear and logical?
Score: 0 (no understanding), ${Math.round(total * 0.1)} (minimal), ${Math.round(total * 0.2)} (basic), ${Math.round(total * 0.3)} (good), ${Math.round(total * 0.4)} (excellent)

Tier 2 - Specific Knowledge & Details (${Math.round(total * 0.35)} marks):
- Does the answer include specific mechanisms or processes?
- Are relevant examples provided?
- Are technical terms used correctly?
Score: 0 (none), ${Math.round(total * 0.1)} (minimal), ${Math.round(total * 0.2)} (some), ${Math.round(total * 0.3)} (good), ${Math.round(total * 0.35)} (comprehensive)

Tier 3 - Critical Analysis & Connections (${Math.round(total * 0.25)} marks):
- Does the answer show connections between ideas?
- Is there evaluation or critical thinking?
- Does the answer address "why" and "how," not just "what"?
Score: 0 (none), ${Math.round(total * 0.05)} (vague), ${Math.round(total * 0.1)} (some), ${Math.round(total * 0.15)} (good), ${Math.round(total * 0.25)} (excellent)

IMPORTANT RULES:
- Follow the strictness guidelines above strictly
- Look for evidence of understanding, not exact wording
- Accept alternative explanations if academically valid
- The total score must be out of ${total}

Return ONLY valid JSON, no markdown:
{"score": <number 0-${total}>,"tier1": <number>,"tier2": <number>,"tier3": <number>,"feedback": "<2-3 sentence explanation of the score>"}`;

  const raw = await callAI(prompt);

  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const data = JSON.parse(match[0]);
    const score = Math.round(Math.min(total, Math.max(0, Number(data.score) || 0)));
    return {
      score,
      tier1: Number(data.tier1) || 0,
      tier2: Number(data.tier2) || 0,
      tier3: Number(data.tier3) || 0,
      feedback: String(data.feedback || ''),
    };
  } catch {
    const userWords = new Set(params.studentAnswer.toLowerCase().split(/\s+/));
    const modelWords = new Set(params.modelAnswer.toLowerCase().split(/\s+/));
    let overlap = 0;
    modelWords.forEach((w) => { if (userWords.has(w)) overlap++; });
    const ratio = modelWords.size > 0 ? overlap / modelWords.size : 0;
    const score = ratio < 0.15 ? 0 : Math.round(Math.min(total, ratio * total));
    return {
      score,
      tier1: Math.round(score * 0.4),
      tier2: Math.round(score * 0.35),
      tier3: Math.round(score * 0.25),
      feedback: score === 0 ? 'Answer does not demonstrate understanding of the topic.' : 'Graded by word overlap (AI grading unavailable).',
    };
  }
}
