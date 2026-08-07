import type { SessionData } from '../types';
import {
  collection, doc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, limit, where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  UserRanking, LeaderboardEntry, RankTier, LeaderboardType,
  GlobalAchievement, AchievementBadge, UserStatistics, SeasonInfo,
  WeeklyMission, DailyReward,
} from '../types';

function ts(): string {
  return new Date().toISOString();
}

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined) clean[k] = sanitize(v); }
  return clean;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SEASON_MS = 90 * 24 * 60 * 60 * 1000;

export const RANK_TIERS: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Mythic'];

export const RANK_TIER_COLORS: Record<RankTier, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Mythic: '#ff69b4',
};

export const RANK_TIER_ICONS: Record<RankTier, string> = {
  Bronze: '🟤',
  Silver: '⚪',
  Gold: '🟡',
  Platinum: '🟣',
  Diamond: '🔵',
  Mythic: '💎',
};

const TIER_XP_THRESHOLDS: Record<RankTier, number> = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
  Diamond: 15000,
  Mythic: 40000,
};

export function getTierForXP(xp: number): RankTier {
  let tier: RankTier = 'Bronze';
  for (const t of RANK_TIERS) {
    if (xp >= TIER_XP_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

export function getXPForTier(tier: RankTier): number {
  return TIER_XP_THRESHOLDS[tier];
}

export function getXPToNextTier(xp: number): number {
  const currentTier = getTierForXP(xp);
  const idx = RANK_TIERS.indexOf(currentTier);
  if (idx >= RANK_TIERS.length - 1) return 0;
  const nextTier = RANK_TIERS[idx + 1];
  return TIER_XP_THRESHOLDS[nextTier] - xp;
}

export function getLevelForXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXPForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function getXPToNextLevel(xp: number): number {
  const level = getLevelForXP(xp);
  return getXPForLevel(level + 1) - xp;
}

export function getRankIcon(level: number): string {
  if (level >= 100) return '👑';
  if (level >= 75) return '💎';
  if (level >= 50) return '🔮';
  if (level >= 40) return '⭐';
  if (level >= 30) return '🌟';
  if (level >= 25) return '🏅';
  if (level >= 20) return '🎖️';
  if (level >= 15) return '🥇';
  if (level >= 10) return '🥈';
  if (level >= 5) return '🥉';
  return '🌱';
}

export function getRankColor(level: number): string {
  if (level >= 100) return '#ffd700';
  if (level >= 75) return '#ff69b4';
  if (level >= 50) return '#9b59b6';
  if (level >= 40) return '#f1c40f';
  if (level >= 30) return '#e67e22';
  if (level >= 25) return '#e74c3c';
  if (level >= 20) return '#1abc9c';
  if (level >= 15) return '#3498db';
  if (level >= 10) return '#2ecc71';
  if (level >= 5) return '#95a5a6';
  return '#bdc3c7';
}

export const XP_REWARDS = {
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
} as const;

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

export interface XPLog {
  amount: number;
  activity: XPActivity;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function calculateSessionXP(
  percentage: number,
  correct: number,
  total: number,
  streak: number,
): number {
  let xp = 0;
  xp += correct * XP_REWARDS.correctAnswer;
  if (percentage === 100) xp += XP_REWARDS.perfectAnswer;
  xp += Math.round((correct / Math.max(total, 1)) * 20);
  if (streak >= 3) xp += Math.floor(streak / 3) * 10;
  return xp;
}

export async function addXP(
  uid: string,
  activity: XPActivity,
  amount?: number,
  metadata?: Record<string, any>,
): Promise<number> {
  const xpAmount = amount ?? XP_REWARDS[activity];
  try {
    const ref = doc(db, 'rankings', uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};

    const totalXP = (existing.totalXP || 0) + xpAmount;
    const level = getLevelForXP(totalXP);
    const tier = getTierForXP(totalXP);
    const weeklyResetTime = existing.weeklyResetAt || ts();

    let resetWeekly = false;
    if (new Date(weeklyResetTime).getTime() < Date.now() - WEEK_MS) {
      resetWeekly = true;
    }

    const updateData: any = {
      totalXP,
      weeklyXP: resetWeekly ? xpAmount : (existing.weeklyXP || 0) + xpAmount,
      weeklyResetAt: resetWeekly ? ts() : weeklyResetTime,
      level,
      tier,
      lastActive: ts(),
    };

    if (metadata?.displayName) updateData.displayName = metadata.displayName;
    if (metadata?.photoURL !== undefined) updateData.photoURL = metadata.photoURL;

    const logRef = doc(collection(db, 'xpLogs'));
    await setDoc(logRef, sanitize({
      uid,
      amount: xpAmount,
      activity,
      timestamp: ts(),
      metadata: metadata || null,
    }));

    await setDoc(ref, sanitize(updateData), { merge: true });
    return xpAmount;
  } catch (e: any) {
    console.error('Failed to add XP:', e);
    return 0;
  }
}

export async function addCoins(uid: string, amount: number, reason: string): Promise<void> {
  try {
    const ref = doc(db, 'rankings', uid);
    await setDoc(ref, sanitize({ coins: (await getDoc(ref)).data()?.coins || 0 + amount }), { merge: true });
    const logRef = doc(collection(db, 'coinLogs'));
    await setDoc(logRef, sanitize({ uid, amount, reason, timestamp: ts() }));
  } catch (e: any) {
    console.error('Failed to add coins:', e);
  }
}

function getCurrentStreak(history: SessionData[]): number {
  if (history.length === 0) return 0;
  let streak = 0;
  const dates = [...new Set(history.map((h) => new Date(h.date).toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const expected = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expectedDate = expected.toDateString();
    if (dates[i] === expectedDate) {
      streak++;
    } else {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      if (dates[i] === checkDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
}

function getMaxStreak(history: SessionData[]): number {
  if (history.length === 0) return 0;
  const dates = [...new Set(history.map((h) => new Date(h.date).toDateString()))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  let maxStreak = 0;
  let currentStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }
  return maxStreak > 0 ? maxStreak : dates.length > 0 ? 1 : 0;
}

export async function updateUserRanking(
  uid: string,
  displayName: string | null,
  photoURL: string | null,
  sessionScore: number,
  correctCount: number,
  totalCount: number,
  currentStreak: number,
): Promise<number> {
  try {
    const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const xpGain = calculateSessionXP(percentage, correctCount, totalCount, currentStreak);

    const ref = doc(db, 'rankings', uid);
    const snap = await getDoc(ref);

    let existing: any = {};
    if (snap.exists()) {
      existing = snap.data();
    }

    const now = ts();
    const weeklyXP = (existing.weeklyXP || 0) + xpGain;
    const weeklyResetTimestamp = existing.weeklyResetAt || now;

    let resetWeekly = false;
    if (new Date(weeklyResetTimestamp).getTime() < Date.now() - WEEK_MS) {
      resetWeekly = true;
    }

    const totalXP = (existing.totalXP || 0) + xpGain;
    const level = getLevelForXP(totalXP);
    const tier = getTierForXP(totalXP);
    const maxStreak = Math.max(existing.maxStreak || 0, currentStreak);
    const correctStreak = percentage >= 80 ? (existing.correctStreak || 0) + 1 : 0;

    const updateData: any = {
      uid,
      displayName,
      photoURL,
      totalXP,
      weeklyXP: resetWeekly ? xpGain : weeklyXP,
      weeklyResetAt: resetWeekly ? now : weeklyResetTimestamp,
      level,
      tier,
      currentStreak,
      maxStreak: maxStreak,
      correctStreak,
      totalQuestions: (existing.totalQuestions || 0) + totalCount,
      totalCorrect: (existing.totalCorrect || 0) + correctCount,
      totalSessions: (existing.totalSessions || 0) + 1,
      lastActive: now,
    };

    await setDoc(ref, sanitize(updateData), { merge: true });

    const logRef = doc(collection(db, 'xpLogs'));
    await setDoc(logRef, sanitize({
      uid,
      amount: xpGain,
      activity: 'correctAnswer',
      timestamp: now,
      metadata: { sessionScore, correctCount, totalCount },
    }));

    return xpGain;
  } catch (e: any) {
    console.error('Failed to update ranking:', e);
    return 0;
  }
}

export function subscribeToLeaderboard(
  type: LeaderboardType,
  cb: (entries: LeaderboardEntry[]) => void,
  limitCount: number = 100,
  filterValue?: string,
): () => void {
  let orderField: string;
  switch (type) {
    case 'weekly': orderField = 'weeklyXP'; break;
    case 'streak': orderField = 'currentStreak'; break;
    case 'country': orderField = 'totalXP'; break;
    case 'school': orderField = 'totalXP'; break;
    default: orderField = 'totalXP'; break;
  }

  let q;
  if (type === 'country' && filterValue) {
    q = query(collection(db, 'rankings'), where('country', '==', filterValue), orderBy(orderField, 'desc'), limit(limitCount));
  } else if (type === 'school' && filterValue) {
    q = query(collection(db, 'rankings'), where('school', '==', filterValue), orderBy(orderField, 'desc'), limit(limitCount));
  } else {
    q = query(collection(db, 'rankings'), orderBy(orderField, 'desc'), limit(limitCount));
  }

  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((doc, idx) => {
      const data = doc.data();
      const rank = data.rank || idx + 1;
      return {
        uid: data.uid,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        totalXP: data.totalXP || 0,
        weeklyXP: data.weeklyXP || 0,
        level: data.level || 1,
        currentStreak: data.currentStreak || 0,
        maxStreak: data.maxStreak || 0,
        rank,
        tier: data.tier || 'Bronze',
        lastActive: data.lastActive || '',
        country: data.country,
        school: data.school,
      } as LeaderboardEntry;
    });
    cb(entries);
  }, (err) => {
    console.error('Leaderboard listener error:', err);
    cb([]);
  });
}

export function subscribeToUserRanking(uid: string, cb: (ranking: UserRanking | null) => void): () => void {
  return onSnapshot(doc(db, 'rankings', uid), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    const d = snap.data();
    cb({
      uid: d.uid,
      displayName: d.displayName || null,
      photoURL: d.photoURL || null,
      totalXP: d.totalXP || 0,
      weeklyXP: d.weeklyXP || 0,
      level: d.level || 1,
      currentStreak: d.currentStreak || 0,
      maxStreak: d.maxStreak || 0,
      correctStreak: d.correctStreak || 0,
      totalQuestions: d.totalQuestions || 0,
      totalCorrect: d.totalCorrect || 0,
      totalSessions: d.totalSessions || 0,
      rank: d.rank || 0,
      tier: d.tier || 'Bronze',
      lastActive: d.lastActive || '',
      country: d.country,
      school: d.school,
      region: d.region,
      className: d.className,
      coins: d.coins || 0,
    } as UserRanking);
  });
}

export async function getUserRank(uid: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'rankings', uid));
    if (!snap.exists()) return 0;
    return snap.data().rank || 0;
  } catch {
    return 0;
  }
}

export const GLOBAL_ACHIEVEMENTS: GlobalAchievement[] = [
  { id: 'global_sessions_100', name: 'Global Learner', description: '100 total sessions worldwide', icon: '🌍', thresholds: [100, 1000, 10000] },
  { id: 'global_questions_1000', name: 'Global Solver', description: '1000 questions answered worldwide', icon: '📚', thresholds: [1000, 10000, 100000] },
  { id: 'global_xp_5000', name: 'Global XP Master', description: '5000 total XP worldwide', icon: '💎', thresholds: [5000, 50000, 500000] },
  { id: 'global_streak_7', name: 'Global Streak Master', description: '7-day streak holder', icon: '🔥', thresholds: [7, 14, 30] },
  { id: 'global_perfect_10', name: 'Global Perfectionist', description: '10 perfect scores worldwide', icon: '⭐', thresholds: [10, 100, 1000] },
];

export async function checkGlobalAchievements(uid: string): Promise<string[]> {
  return [];
}

export async function recalculateRanks(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'rankings'), limit(1000)));
    const entries = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));

    const batch = await import('firebase/firestore').then((m) => m.writeBatch(db));
    entries.forEach((entry, idx) => {
      const ref = doc(db, 'rankings', entry.id);
      batch.update(ref, { rank: idx + 1 });
    });
    await batch.commit();
  } catch (e: any) {
    console.error('Failed to recalculate ranks:', e);
  }
}

export const ALL_BADGES: AchievementBadge[] = [
  { id: 'first_lesson', name: 'First Lesson', description: 'Complete your first lesson', icon: '📚', category: 'learning', requirement: 1, metric: 'sessions', unlocked: false },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Complete 25 lessons', icon: '📖', category: 'learning', requirement: 25, metric: 'sessions', unlocked: false },
  { id: 'study_champion', name: 'Study Champion', description: 'Complete 100 lessons', icon: '🎓', category: 'learning', requirement: 100, metric: 'sessions', unlocked: false },
  { id: 'genius_mind', name: 'Genius Mind', description: 'Answer 1000 questions correctly', icon: '🧠', category: 'learning', requirement: 1000, metric: 'questions', unlocked: false },
  { id: 'streak_7', name: '7-Day Streak', description: 'Study for 7 consecutive days', icon: '🔥', category: 'streak', requirement: 7, metric: 'streak', unlocked: false },
  { id: 'streak_30', name: '30-Day Streak', description: 'Study for 30 consecutive days', icon: '🔥', category: 'streak', requirement: 30, metric: 'streak', unlocked: false },
  { id: 'streak_100', name: '100-Day Streak', description: 'Study for 100 consecutive days', icon: '🔥', category: 'streak', requirement: 100, metric: 'streak', unlocked: false },
  { id: 'streak_365', name: '365-Day Legend', description: 'Study for 365 consecutive days', icon: '👑', category: 'streak', requirement: 365, metric: 'streak', unlocked: false },
  { id: 'challenger', name: 'Challenger', description: 'Win 5 multiplayer matches', icon: '⚔️', category: 'multiplayer', requirement: 5, metric: 'wins', unlocked: false },
  { id: 'champion', name: 'Champion', description: 'Win 25 multiplayer matches', icon: '🏆', category: 'multiplayer', requirement: 25, metric: 'wins', unlocked: false },
  { id: 'grand_master', name: 'Grand Master', description: 'Win 100 multiplayer matches', icon: '👑', category: 'multiplayer', requirement: 100, metric: 'wins', unlocked: false },
  { id: 'ai_explorer', name: 'AI Explorer', description: 'Complete 10 FenBot sessions', icon: '🤖', category: 'fenbot', requirement: 10, metric: 'sessions', unlocked: false },
  { id: 'fenbot_master', name: 'FenBot Master', description: 'Complete 50 FenBot sessions', icon: '🤖', category: 'fenbot', requirement: 50, metric: 'sessions', unlocked: false },
  { id: 'ai_genius', name: 'AI Genius', description: 'Complete 100 FenBot sessions', icon: '🤖', category: 'fenbot', requirement: 100, metric: 'sessions', unlocked: false },
  { id: 'helpful_student', name: 'Helpful Student', description: 'Help 5 other students', icon: '❤️', category: 'community', requirement: 5, metric: 'friends', unlocked: false },
  { id: 'community_hero', name: 'Community Hero', description: 'Help 25 other students', icon: '🌍', category: 'community', requirement: 25, metric: 'friends', unlocked: false },
  { id: 'stand_ambassador', name: 'STand Ambassador', description: 'Help 100 other students', icon: '👑', category: 'community', requirement: 100, metric: 'friends', unlocked: false },
  { id: 'top_100_global', name: 'Top 100 Global', description: 'Reach top 100 globally', icon: '🥇', category: 'global', requirement: 100, metric: 'rank', unlocked: false },
  { id: 'top_1000_global', name: 'Top 1000 Global', description: 'Reach top 1000 globally', icon: '🥈', category: 'global', requirement: 1000, metric: 'rank', unlocked: false },
  { id: 'top_1_percent', name: 'Top 1%', description: 'Reach top 1% globally', icon: '🌍', category: 'global', requirement: 1, metric: 'rank', unlocked: false },
  { id: 'world_champion', name: 'World Champion', description: 'Reach #1 globally', icon: '🌎', category: 'global', requirement: 1, metric: 'rank', unlocked: false },
];

export function checkBadges(stats: UserStatistics, currentRank: number): AchievementBadge[] {
  return ALL_BADGES.map((badge) => {
    let value = 0;
    switch (badge.metric) {
      case 'sessions': value = stats.lessonsCompleted; break;
      case 'questions': value = stats.questionsAnswered; break;
      case 'streak': value = stats.currentStreak; break;
      case 'wins': value = stats.multiplayerWins; break;
      case 'friends': value = stats.friendsHelped; break;
      case 'rank': value = currentRank; break;
      default: value = 0;
    }
    const unlocked = badge.metric === 'rank' ? value <= badge.requirement && value > 0 : value >= badge.requirement;
    return { ...badge, unlocked };
  });
}

export function getDefaultStats(): UserStatistics {
  return {
    questionsAnswered: 0,
    accuracyRate: 0,
    avgResponseTime: 0,
    lessonsCompleted: 0,
    challengesCompleted: 0,
    multiplayerWins: 0,
    friendsHelped: 0,
    totalStudyHours: 0,
    currentStreak: 0,
    longestStreak: 0,
  };
}

export function getWeeklyMissions(): WeeklyMission[] {
  return [
    { id: 'answer_100', title: 'Answer 100 Questions', description: 'Answer 100 questions this week', icon: '❓', target: 100, current: 0, xpReward: 200, coinReward: 50, completed: false },
    { id: 'study_5h', title: 'Study 5 Hours', description: 'Study for 5 hours this week', icon: '⏰', target: 300, current: 0, xpReward: 150, coinReward: 30, completed: false },
    { id: 'complete_3', title: 'Complete 3 Challenges', description: 'Complete 3 challenges', icon: '🎯', target: 3, current: 0, xpReward: 300, coinReward: 75, completed: false },
    { id: 'win_10_mp', title: 'Win 10 Multiplayer', description: 'Win 10 multiplayer matches', icon: '⚔️', target: 10, current: 0, xpReward: 500, coinReward: 100, completed: false },
    { id: 'teach_20', title: 'Teach FenBot 20 Times', description: 'Teach FenBot 20 times', icon: '🤖', target: 20, current: 0, xpReward: 400, coinReward: 80, completed: false },
  ];
}

export function getDailyRewards(): DailyReward[] {
  return [
    { day: 1, xp: 20, coins: 5 },
    { day: 2, xp: 40, coins: 10 },
    { day: 3, xp: 60, coins: 15 },
    { day: 4, xp: 80, coins: 20 },
    { day: 5, xp: 100, coins: 25 },
    { day: 6, xp: 120, coins: 30 },
    { day: 7, xp: 200, coins: 50, special: 'Rare Badge' },
    { day: 14, xp: 300, coins: 75 },
    { day: 21, xp: 400, coins: 100 },
    { day: 30, xp: 600, coins: 200, special: 'Premium Avatar' },
    { day: 60, xp: 1000, coins: 400 },
    { day: 100, xp: 2000, coins: 1000, special: 'Legendary Frame' },
  ];
}

export function getCurrentSeason(): SeasonInfo {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const seasonEnd = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + 3, 0);
  const seasonNum = Math.floor((now.getMonth() / 3)) + 1;
  return {
    id: `season-${now.getFullYear()}-${seasonNum}`,
    name: `Season ${seasonNum} ${now.getFullYear()}`,
    startDate: seasonStart.toISOString(),
    endDate: seasonEnd.toISOString(),
    rank: 0,
  };
}

export async function claimDailyReward(uid: string, day: number): Promise<{ xp: number; coins: number } | null> {
  const rewards = getDailyRewards();
  const reward = rewards.find((r) => r.day === day);
  if (!reward) return null;
  await addXP(uid, 'dailyChallenge', reward.xp);
  await addCoins(uid, reward.coins, `Daily reward day ${day}`);
  return { xp: reward.xp, coins: reward.coins };
}

export async function updateUserLocation(uid: string, country: string, region: string, school: string, className: string): Promise<void> {
  try {
    const ref = doc(db, 'rankings', uid);
    await setDoc(ref, sanitize({ country, region, school, className }), { merge: true });
  } catch (e: any) {
    console.error('Failed to update location:', e);
  }
}
