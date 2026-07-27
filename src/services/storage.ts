import type { SessionData, Question } from '../types';

const HISTORY_KEY = 'stand_history';
const USER_TOKEN_KEY = 'stand_user_token';
const USER_KEY = 'stand_user';
const STUDY_PLANS_KEY = 'stand_study_plans';
const BOOKMARKS_KEY = 'stand_bookmarks';

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
};
