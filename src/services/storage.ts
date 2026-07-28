import type { SessionData, Question, QuestionTiming, StoredAchievement, QuestionNote } from '../types';

const USER_TOKEN_KEY = 'stand_user_token';
const USER_KEY = 'stand_user';
const USERS_KEY = 'stand_users';

let _userId: string | null = null;
let _onDataChange: (() => void) | null = null;

function k(base: string): string {
  return _userId ? `${base}_${_userId}` : base;
}

function notifyChange(): void {
  if (_onDataChange) _onDataChange();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any): void {
  localStorage.setItem(k(key), JSON.stringify(value));
}

export const storage = {
  setActiveUserId(id: string | null): void {
    _userId = id;
  },

  setOnDataChange(callback: (() => void) | null): void {
    _onDataChange = callback;
  },

  getActiveUserId(): string | null {
    return _userId;
  },

  getToken(): string | null {
    return localStorage.getItem(USER_TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(USER_TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(USER_TOKEN_KEY);
  },

  getUser(): { fullName: string; email: string; photoURL?: string | null } | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user: { fullName: string; email: string; photoURL?: string | null }): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  getUsers(): Array<{ fullName: string; email: string; passwordHash: string; createdAt: string }> {
    return readJson(USERS_KEY, []);
  },

  saveUser(user: { fullName: string; email: string; passwordHash: string; createdAt: string }): void {
    const users = this.getUsers();
    users.push(user);
    writeJson(USERS_KEY, users);
  },

  getHistory(): SessionData[] {
    return readJson<SessionData[]>('stand_history', []);
  },

  saveSession(session: SessionData): void {
    const history = this.getHistory();
    history.push(session);
    writeJson('stand_history', history);
    notifyChange();
  },

  clearHistory(): void {
    localStorage.removeItem(k('stand_history'));
    notifyChange();
  },

  setHistory(data: SessionData[]): void {
    writeJson('stand_history', data);
  },

  getStudyPlans(): any[] {
    return readJson('stand_study_plans', []);
  },

  setStudyPlans(data: any[]): void {
    writeJson('stand_study_plans', data);
  },

  saveStudyPlan(plan: any): void {
    const plans = this.getStudyPlans();
    const existing = plans.findIndex((p: any) => p.id === plan.id);
    if (existing >= 0) {
      plans[existing] = plan;
    } else {
      plans.push(plan);
    }
    writeJson('stand_study_plans', plans);
    notifyChange();
  },

  deleteStudyPlan(id: string): void {
    const plans = this.getStudyPlans().filter((p: any) => p.id !== id);
    writeJson('stand_study_plans', plans);
    notifyChange();
  },

  getBookmarks(): Question[] {
    return readJson<Question[]>('stand_bookmarks', []);
  },

  toggleBookmark(question: Question): boolean {
    const bookmarks = this.getBookmarks();
    const index = bookmarks.findIndex((b) => b.id === question.id);
    if (index >= 0) {
      bookmarks.splice(index, 1);
      writeJson('stand_bookmarks', bookmarks);
      notifyChange();
      return false;
    } else {
      bookmarks.push(question);
      writeJson('stand_bookmarks', bookmarks);
      notifyChange();
      return true;
    }
  },

  isBookmarked(questionId: string): boolean {
    return this.getBookmarks().some((b) => b.id === questionId);
  },

  setBookmarks(data: Question[]): void {
    writeJson('stand_bookmarks', data);
  },

  getQuestionTimings(): QuestionTiming[] {
    return readJson<QuestionTiming[]>('stand_question_timings', []);
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
    writeJson('stand_question_timings', merged);
    notifyChange();
  },

  setQuestionTimings(data: QuestionTiming[]): void {
    writeJson('stand_question_timings', data);
  },

  getAchievements(): StoredAchievement[] {
    return readJson<StoredAchievement[]>('stand_achievements', []);
  },

  unlockAchievement(id: string): boolean {
    const achievements = this.getAchievements();
    if (achievements.some((a) => a.id === id)) return false;
    achievements.push({ id, unlockedAt: new Date().toISOString() });
    writeJson('stand_achievements', achievements);
    notifyChange();
    return true;
  },

  setAchievements(data: StoredAchievement[]): void {
    writeJson('stand_achievements', data);
  },

  isAchievementUnlocked(id: string): boolean {
    return this.getAchievements().some((a) => a.id === id);
  },

  getQuestionNote(questionId: string): string {
    const notes = readJson<Record<string, string>>('stand_question_notes', {});
    return notes[questionId] || '';
  },

  setQuestionNote(questionId: string, note: string): void {
    const notes = readJson<Record<string, string>>('stand_question_notes', {});
    if (note.trim()) {
      notes[questionId] = note;
    } else {
      delete notes[questionId];
    }
    writeJson('stand_question_notes', notes);
    notifyChange();
  },

  getAllQuestionNotes(): Record<string, string> {
    return readJson<Record<string, string>>('stand_question_notes', {});
  },

  setAllQuestionNotes(data: Record<string, string>): void {
    writeJson('stand_question_notes', data);
  },

  getImportedQuestions(): Question[] {
    return readJson<Question[]>('stand_imported_questions', []);
  },

  saveImportedQuestions(questions: Question[]): void {
    writeJson('stand_imported_questions', questions);
    notifyChange();
  },

  setImportedQuestions(data: Question[]): void {
    writeJson('stand_imported_questions', data);
  },

  getProfilePhoto(): string | null {
    try {
      return localStorage.getItem(k('stand_profile_photo'));
    } catch {
      return null;
    }
  },

  setProfilePhoto(dataUrl: string | null): void {
    if (dataUrl) {
      localStorage.setItem(k('stand_profile_photo'), dataUrl);
    } else {
      localStorage.removeItem(k('stand_profile_photo'));
    }
    notifyChange();
  },

  getDisplayName(): string | null {
    try {
      return localStorage.getItem(k('stand_display_name'));
    } catch {
      return null;
    }
  },

  setDisplayName(name: string): void {
    localStorage.setItem(k('stand_display_name'), name);
    notifyChange();
  },
};
