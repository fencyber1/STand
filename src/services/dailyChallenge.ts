import type { Question } from '../types';
import { storage } from './storage';
import { generateQuestions } from './api';

export interface DailyChallenge {
  date: string;
  questions: Question[];
  completed: boolean;
  score: number;
  totalQuestions: number;
  startedAt?: number;
  completedAt?: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function getDailyChallenge(): DailyChallenge | null {
  const stored = storage.getDailyChallengeData();
  if (!stored) return null;
  if (stored.date !== getTodayKey()) {
    storage.saveDailyChallengeData({ ...stored, date: getTodayKey(), questions: [], completed: false, score: 0, totalQuestions: 0, startedAt: Date.now() });
    return null;
  }
  return stored;
}

export async function generateDailyChallenge(): Promise<DailyChallenge> {
  const existing = getDailyChallenge();
  if (existing) return existing;

  const history = storage.getHistory();
  const sectors: Record<string, number> = {};
  for (const h of history) {
    sectors[h.sector] = (sectors[h.sector] || 0) + 1;
  }

  const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General Science';
  const topicOptions: Record<string, string[]> = {
    'General Science': ['Biology', 'Chemistry', 'Physics'],
    'Mathematics': ['Algebra', 'Geometry', 'Statistics'],
    'English Language': ['Grammar', 'Vocabulary', 'Comprehension'],
    'Literature': ['Poetry', 'Prose', 'Drama'],
    'Computer Science': ['Programming', 'Data Structures', 'Algorithms'],
    'Economics': ['Microeconomics', 'Macroeconomics', 'Trade'],
    'Geography': ['Physical Geography', 'Human Geography', 'Climate'],
    'History': ['Ancient History', 'Modern History', 'World Wars'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology'],
    'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'],
    'Physics': ['Mechanics', 'Thermodynamics', 'Optics'],
  };

  const topics = topicOptions[topSector] || ['General'];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  try {
    const result = await generateQuestions({
      topic,
      sector: topSector,
      level: 'SSS/WAEC',
      questionType: 'MCQ',
      count: 5,
      difficulty: 'medium',
    });

    const challenge: DailyChallenge = {
      date: getTodayKey(),
      questions: result.questions.slice(0, 5),
      completed: false,
      score: 0,
      totalQuestions: Math.min(result.questions.length, 5),
      startedAt: Date.now(),
    };

    storage.saveDailyChallengeData(challenge);
    return challenge;
  } catch {
    const fallback: DailyChallenge = {
      date: getTodayKey(),
      questions: generateFallbackQuestions(topSector, topic),
      completed: false,
      score: 0,
      totalQuestions: 5,
      startedAt: Date.now(),
    };
    storage.saveDailyChallengeData(fallback);
    return fallback;
  }
}

function generateFallbackQuestions(sector: string, topic: string): Question[] {
  const templates: Question[] = [
    {
      id: `dc-${Date.now()}-1`,
      question: `Which of the following is a key concept in ${topic}?`,
      type: 'MCQ',
      options: ['A. Photosynthesis', 'B. Gravity', 'C. Evolution', 'D. All of the above'],
      correctAnswer: 'D. All of the above',
      explanation: `${topic} encompasses multiple fundamental concepts.`,
      difficulty: 'medium',
      subject: sector,
      topic,
      imageQuery: topic,
    },
    {
      id: `dc-${Date.now()}-2`,
      question: `What is the primary focus of ${topic} in ${sector}?`,
      type: 'MCQ',
      options: ['A. Historical events', 'B. Scientific principles', 'C. Literary analysis', 'D. Economic theories'],
      correctAnswer: 'B. Scientific principles',
      explanation: `${topic} primarily deals with scientific principles and their applications.`,
      difficulty: 'medium',
      subject: sector,
      topic,
      imageQuery: topic,
    },
    {
      id: `dc-${Date.now()}-3`,
      question: `In ${topic}, which factor is most important for understanding the subject?`,
      type: 'MCQ',
      options: ['A. Memorization', 'B. Critical thinking', 'C. Reading speed', 'D. Note taking'],
      correctAnswer: 'B. Critical thinking',
      explanation: 'Critical thinking is essential for understanding any scientific topic deeply.',
      difficulty: 'medium',
      subject: sector,
      topic,
      imageQuery: topic,
    },
    {
      id: `dc-${Date.now()}-4`,
      question: `Which scientist is most associated with ${topic}?`,
      type: 'MCQ',
      options: ['A. Isaac Newton', 'B. Charles Darwin', 'C. Albert Einstein', 'D. Marie Curie'],
      correctAnswer: 'A. Isaac Newton',
      explanation: 'Many foundational concepts in science were pioneered by these great minds.',
      difficulty: 'medium',
      subject: sector,
      topic,
      imageQuery: topic,
    },
    {
      id: `dc-${Date.now()}-5`,
      question: `What is a practical application of ${topic} in everyday life?`,
      type: 'MCQ',
      options: ['A. Cooking', 'B. Technology', 'C. Transportation', 'D. All of the above'],
      correctAnswer: 'D. All of the above',
      explanation: `${topic} has applications in virtually every aspect of modern life.`,
      difficulty: 'medium',
      subject: sector,
      topic,
      imageQuery: topic,
    },
  ];
  return templates;
}

export function saveDailyChallengeResult(score: number, totalQuestions: number): void {
  const challenge = getDailyChallenge();
  if (!challenge) return;

  challenge.completed = true;
  challenge.score = score;
  challenge.totalQuestions = totalQuestions;
  challenge.completedAt = Date.now();
  storage.saveDailyChallengeData(challenge);

  const streak = storage.getDailyChallengeStreak();
  const today = getTodayKey();
  const yesterday = getDateKey(-1);

  if (streak.lastDate === yesterday) {
    streak.current += 1;
  } else if (streak.lastDate !== today) {
    streak.current = 1;
  }
  streak.best = Math.max(streak.best, streak.current);
  streak.lastDate = today;
  storage.saveDailyChallengeStreak(streak);
}

export function getDailyChallengeStreak(): { current: number; best: number; lastDate: string | null } {
  return storage.getDailyChallengeStreak();
}

export function isDailyChallengeCompleted(): boolean {
  const challenge = getDailyChallenge();
  return challenge?.completed ?? false;
}
