import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SessionData, Question, QuestionTiming, StoredAchievement, SavedDocument } from '../types';

export interface UserDataDoc {
  history: SessionData[];
  bookmarks: Question[];
  studyPlans: any[];
  questionTimings: QuestionTiming[];
  achievements: StoredAchievement[];
  questionNotes: Record<string, string>;
  importedQuestions: Question[];
  savedDocuments: SavedDocument[];
  profilePhoto: string | null;
  displayName: string | null;
  bio: string;
  surname: string;
  role: string;
  hobby: string;
  country: string;
  updatedAt: any;
}

function mergeArrays<T>(local: T[], remote: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(keyFn(item), item);
  for (const item of local) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

export async function saveUserDataToFirestore(uid: string, data: Partial<UserDataDoc>): Promise<void> {
  try {
    const ref = doc(db, 'userData', uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as UserDataDoc) : {};

    await setDoc(ref, { ...existing, ...data, updatedAt: serverTimestamp() });
  } catch (e) {
    console.error('Failed to save to Firestore:', e);
  }
}

export async function loadUserDataFromFirestore(uid: string): Promise<UserDataDoc | null> {
  try {
    const ref = doc(db, 'userData', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserDataDoc;
  } catch (e) {
    console.error('Failed to load from Firestore:', e);
    return null;
  }
}

export function mergeUserData(
  local: {
    history: SessionData[];
    bookmarks: Question[];
    studyPlans: any[];
    questionTimings: QuestionTiming[];
    achievements: StoredAchievement[];
    questionNotes: Record<string, string>;
    importedQuestions: Question[];
    savedDocuments: SavedDocument[];
    profilePhoto: string | null;
    displayName: string | null;
    bio: string;
    surname: string;
    role: string;
    hobby: string;
    country: string;
  },
  remote: UserDataDoc | null
) {
  if (!remote) return local;

  return {
    history: mergeArrays(local.history, remote.history || [], (h: any) => h.id || `${h.date}_${h.score}`),
    bookmarks: mergeArrays(local.bookmarks, remote.bookmarks || [], (b) => b.id),
    studyPlans: mergeArrays(local.studyPlans, remote.studyPlans || [], (p: any) => p.id || ''),
    questionTimings: mergeArrays(local.questionTimings, remote.questionTimings || [], (t) => t.questionId),
    achievements: mergeArrays(local.achievements, remote.achievements || [], (a) => a.id),
    questionNotes: { ...(remote.questionNotes || {}), ...local.questionNotes },
    importedQuestions: mergeArrays(local.importedQuestions, remote.importedQuestions || [], (q) => q.id),
    savedDocuments: mergeArrays(local.savedDocuments, remote.savedDocuments || [], (d) => d.id),
    profilePhoto: local.profilePhoto || remote.profilePhoto || null,
    displayName: local.displayName || remote.displayName || null,
    bio: local.bio || remote.bio || '',
    surname: local.surname || remote.surname || '',
    role: local.role || remote.role || '',
    hobby: local.hobby || remote.hobby || '',
    country: local.country || remote.country || '',
  };
}

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync(uid: string, data: Partial<UserDataDoc>): void {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    saveUserDataToFirestore(uid, data);
  }, 1500);
}
