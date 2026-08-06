import type { SessionData } from '../types';
import {
  collection, doc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  UserRanking, LeaderboardEntry, RankTier, LeaderboardType,
  GlobalAchievement,
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
): () => void {
  let orderField: string;
  switch (type) {
    case 'weekly': orderField = 'weeklyXP'; break;
    case 'streak': orderField = 'currentStreak'; break;
    default: orderField = 'totalXP'; break;
  }

  const q = query(collection(db, 'rankings'), orderBy(orderField, 'desc'), limit(limitCount));
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
