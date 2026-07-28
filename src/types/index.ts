export type User = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastLogin: string;
};

export type QuestionType = 'MCQ' | 'Theory' | 'FillBlank' | 'TrueFalse' | 'Matching';

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  topic: string;
  imageQuery?: string;
  image?: string;
  audio?: string;
}

export interface Answer {
  questionId: string;
  userAnswer: string | string[];
  correct: boolean;
  explanation: string;
  timestamp: string;
  score?: number;
}

export interface Session {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  level: string;
  questionType: string;
  date: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  duration: number;
  answers: Answer[];
}

export interface ProgressData {
  subject: string;
  overallScore: number;
  weakAreas: string[];
  improvementTrend: number;
  totalSessions: number;
  timeSpent: number;
}

export interface StudyPlan {
  id: string;
  userId: string;
  goal: string;
  targetDate: string;
  dailyGoal: number;
  currentStreak: number;
  completedDays: number;
  totalDays: number;
  subjects: string[];
}

export interface Achievement {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  isUnlocked: boolean;
}

export interface BookmarkedQuestion {
  id: string;
  userId: string;
  questionId: string;
  note?: string;
  createdAt: string;
}

export interface CustomQuestion {
  id: string;
  userId: string;
  question: string;
  answer: string;
  subject: string;
  difficulty: string;
  createdAt: string;
}

export interface NotificationSetting {
  id: string;
  userId: string;
  reminderTime: string;
  dailyGoalNotification: boolean;
  achievementNotification: boolean;
  studyReminder: boolean;
}

export interface ExamSimulation {
  id: string;
  userId: string;
  name: string;
  subject: string;
  totalQuestions: number;
  timeLimit: number;
  date: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  score?: number;
}

export interface SessionData {
  id: string;
  topic: string;
  sector: string;
  level: string;
  questionType: string;
  date: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
}

export type UserStats = {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  totalTime: number;
  overallScore: number;
};

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    strokeWidth?: number;
  }[];
}

export type RouteParams = {
  topic: string;
  sector: string;
  level: string;
  questions: Question[];
  results?: any;
  correctCount?: number;
  totalCount?: number;
  totalScore?: number;
};

export interface QuestionTiming {
  questionId: string;
  timeSpent: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  streak: number;
  perfectScores: number;
  subjects: number;
  timeSpent: number;
  fastestAnswer: number | null;
}

export interface StoredAchievement {
  id: string;
  unlockedAt: string;
}

export interface QuestionNote {
  questionId: string;
  note: string;
  updatedAt: string;
}

// ── Social Types ──

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: string;
  online: boolean;
  lastSeen: string;
  typingIn: string | null;
  bio: string;
}

export interface FriendRequest {
  id: string;
  from: string;
  fromName: string;
  fromPhoto: string | null;
  to: string;
  toName: string;
  toPhoto: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Friend {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: string;
  online: boolean;
  lastSeen: string;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  likes: string[];
  commentCount: number;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
  memberPhotos: Record<string, string | null>;
  lastMessage: string;
  lastMessageBy: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ChatGroup {
  id: string;
  name: string;
  members: { uid: string; name: string; photoURL: string | null; role: 'admin' | 'member' }[];
  createdBy: string;
  lastMessage: string;
  lastMessageBy: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface Presence {
  uid: string;
  online: boolean;
  lastSeen: string;
  typingIn: string | null;
}