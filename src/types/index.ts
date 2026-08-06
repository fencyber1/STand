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
  surname: string;
  role: string;
  hobby: string;
  country: string;
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
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  mediaType?: string;
  likes: string[];
  commentCount: number;
  reposts: string[];
  shares: number;
  repostOf?: string;
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
  pinnedMessageId?: string;
  pinnedAt?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  type?: 'text' | 'image' | 'audio' | 'document' | 'contact' | 'location';
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  contact?: { name: string; phone: string; email: string };
  location?: { lat: number; lng: number; name: string };
  edited?: boolean;
  createdAt: string;
  read: boolean;
  pinned?: boolean;
  replyTo?: { id: string; senderName: string; text: string };
  deletedBy?: string[];
}

export interface ChatGroup {
  id: string;
  name: string;
  photoURL: string | null;
  description: string;
  members: { uid: string; name: string; photoURL: string | null; role: 'admin' | 'member' }[];
  memberUids: string[];
  createdBy: string;
  settings: {
    messagePermission: 'all' | 'admins';
    editProfile: 'all' | 'admins';
  };
  lastMessage: string;
  lastMessageBy: string;
  lastMessageAt: string;
  createdAt: string;
  pinnedMessageId?: string;
  pinnedAt?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  type?: 'text' | 'image' | 'audio' | 'document' | 'contact' | 'location';
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  contact?: { name: string; phone: string; email: string };
  location?: { lat: number; lng: number; name: string };
  edited?: boolean;
  createdAt: string;
  readBy: string[];
  pinned?: boolean;
  replyTo?: { id: string; senderName: string; text: string };
  deletedBy?: string[];
}

export interface Presence {
  uid: string;
  online: boolean;
  lastSeen: string;
  typingIn: string | null;
}

export interface ChatTheme {
  id: string;
  name: string;
  gradient: string;
  bubbleOwn: string;
  bubbleReceived: string;
  senderNameColor: string;
  headerBg: string;
  inputBg: string;
  inputField: string;
  sendButton: string;
  sendButtonShadow: string;
  textColor: string;
  timestampColor: string;
  onlineIndicator: string;
  avatarRing: string;
}

export interface SavedDocument {
  id: string;
  name: string;
  text: string;
  wordCount: number;
  createdAt: string;
}

// ── Notifications ──

export interface Notification {
  id: string;
  uid: string;
  type: 'friend_request' | 'message' | 'group_message' | 'achievement' | 'post_like' | 'post_comment';
  title: string;
  body: string;
  link: string;
  fromUid: string;
  fromName: string;
  fromPhoto: string;
  read: boolean;
  createdAt: string;
}

// ── Status ──

export interface Status {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  type: 'text' | 'image';
  content: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: string;
  likes: string[];
  viewedBy: string[];
  createdAt: string;
  expiresAt: string;
}

export interface StatusComment {
  id: string;
  statusId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  createdAt: string;
  replyTo?: { id: string; displayName: string; text: string };
  edited?: boolean;
  likes?: string[];
}

// ── Rankings & Global Achievements ──

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Mythic';

export interface UserRanking {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  totalXP: number;
  weeklyXP: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  correctStreak: number;
  totalQuestions: number;
  totalCorrect: number;
  totalSessions: number;
  rank: number;
  tier: RankTier;
  lastActive: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  totalXP: number;
  weeklyXP: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  rank: number;
  tier: RankTier;
  lastActive: string;
}

export interface GlobalAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  thresholds: number[];
}

export type LeaderboardType = 'overall' | 'weekly' | 'streak';

export type XPActivity =
  | 'correctAnswer'
  | 'perfectAnswer'
  | 'dailyChallenge'
  | 'completeLesson'
  | 'teachMode'
  | 'fastestModeWin'
  | 'multiplayerWin'
  | 'streak7Day'
  | 'streak30Day'
  | 'helpAnotherStudent';

export const XP_REWARDS: Record<XPActivity, number> = {
  correctAnswer: 10,
  perfectAnswer: 20,
  dailyChallenge: 100,
  completeLesson: 150,
  teachMode: 60,
  fastestModeWin: 80,
  multiplayerWin: 200,
  streak7Day: 300,
  streak30Day: 1500,
  helpAnotherStudent: 50,
};

export const XP_ACTIVITY_LABELS: Record<XPActivity, string> = {
  correctAnswer: 'Correct Answer',
  perfectAnswer: 'Perfect Answer',
  dailyChallenge: 'Daily Challenge',
  completeLesson: 'Complete Lesson',
  teachMode: 'Teach Mode',
  fastestModeWin: 'Fastest Mode Win',
  multiplayerWin: 'Multiplayer Win',
  streak7Day: '7-Day Streak',
  streak30Day: '30-Day Streak',
  helpAnotherStudent: 'Help Another Student',
};

export const XP_ACTIVITY_ICONS: Record<XPActivity, string> = {
  correctAnswer: '✅',
  perfectAnswer: '⭐',
  dailyChallenge: '🎯',
  completeLesson: '📖',
  teachMode: '🎓',
  fastestModeWin: '⚡',
  multiplayerWin: '🏆',
  streak7Day: '🔥',
  streak30Day: '💎',
  helpAnotherStudent: '🤝',
};