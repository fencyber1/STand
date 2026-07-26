import type { SessionData } from '../types';

const HISTORY_KEY = 'stand_history';
const USER_TOKEN_KEY = 'stand_user_token';
const STUDY_PLANS_KEY = 'stand_study_plans';

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
};
