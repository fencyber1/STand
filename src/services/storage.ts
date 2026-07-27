import type { SessionData, Question, QuestionTiming, StoredAchievement, QuestionNote } from '../types';

const HISTORY_KEY = 'stand_history';
const USER_TOKEN_KEY = 'stand_user_token';
const USER_KEY = 'stand_user';
const USERS_KEY = 'stand_users';
const STUDY_PLANS_KEY = 'stand_study_plans';
const BOOKMARKS_KEY = 'stand_bookmarks';
const QUESTION_TIMINGS_KEY = 'stand_question_timings';
const ACHIEVEMENTS_KEY = 'stand_achievements';
const QUESTION_NOTES_KEY = 'stand_question_notes';

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(USER_TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(USER_TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(USER_TOKEN_KEY);
  },

  getUser(): { fullName: string; email: string } | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user: { fullName: string; email: string }): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  getUsers(): Array<{ fullName: string; email: string; passwordHash: string; createdAt: string }> {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveUser(user: { fullName: string; email: string; passwordHash: string; createdAt: string }): void {
    const users = this.getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getHistory(): SessionData[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSession(session: SessionData): void {
    const history = this.getHistory();
    history.push(session);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
  },

  getStudyPlans(): any[] {
    try {
      const raw = localStorage.getItem(STUDY_PLANS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveStudyPlan(plan: any): void {
    const plans = this.getStudyPlans();
    const existing = plans.findIndex((p) => p.id === plan.id);
    if (existing >= 0) {
      plans[existing] = plan;
    } else {
      plans.push(plan);
    }
    localStorage.setItem(STUDY_PLANS_KEY, JSON.stringify(plans));
  },

  deleteStudyPlan(id: string): void {
    const plans = this.getStudyPlans().filter((p) => p.id !== id);
    localStorage.setItem(STUDY_PLANS_KEY, JSON.stringify(plans));
  },

  getBookmarks(): Question[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleBookmark(question: Question): boolean {
    const bookmarks = this.getBookmarks();
    const index = bookmarks.findIndex((b) => b.id === question.id);
    if (index >= 0) {
      bookmarks.splice(index, 1);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return false;
    } else {
      bookmarks.push(question);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true;
    }
  },

  isBookmarked(questionId: string): boolean {
    return this.getBookmarks().some((b) => b.id === questionId);
  },

  getQuestionTimings(): QuestionTiming[] {
    try {
      const raw = localStorage.getItem(QUESTION_TIMINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveQuestionTimings(timings: QuestionTiming[]): void {
    const existing = this.getQuestionTimings();
    const merged = [...existing];
    for (const t of timings) {
      const idx = merged.findIndex((e) => e.questionId === t.questionId);
      if (idx >= 0) {
        merged[idx] = t;
      } else {
        merged.push(t);
      }
    }
    localStorage.setItem(QUESTION_TIMINGS_KEY, JSON.stringify(merged));
  },

  getAchievements(): StoredAchievement[] {
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  unlockAchievement(id: string): boolean {
    const achievements = this.getAchievements();
    if (achievements.some((a) => a.id === id)) return false;
    achievements.push({ id, unlockedAt: new Date().toISOString() });
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    return true;
  },

  isAchievementUnlocked(id: string): boolean {
    return this.getAchievements().some((a) => a.id === id);
  },

  getQuestionNote(questionId: string): string {
    try {
      const raw = localStorage.getItem(QUESTION_NOTES_KEY);
      const notes: Record<string, string> = raw ? JSON.parse(raw) : {};
      return notes[questionId] || '';
    } catch {
      return '';
    }
  },

  setQuestionNote(questionId: string, note: string): void {
    try {
      const raw = localStorage.getItem(QUESTION_NOTES_KEY);
      const notes: Record<string, string> = raw ? JSON.parse(raw) : {};
      if (note.trim()) {
        notes[questionId] = note;
      } else {
        delete notes[questionId];
      }
      localStorage.setItem(QUESTION_NOTES_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  },

  getAllQuestionNotes(): Record<string, string> {
    try {
      const raw = localStorage.getItem(QUESTION_NOTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
};
