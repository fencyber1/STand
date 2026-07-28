import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { storage } from '../services/storage';
import { loadUserDataFromFirestore, saveUserDataToFirestore, scheduleSync } from '../services/firestoreSync';

interface AuthUser {
  fullName: string;
  email: string;
  photoURL: string | null;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => void;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  loginWithGoogle: () => {},
  register: async () => ({ success: false }),
  logout: async () => {},
});

function mapUser(u: FirebaseUser): AuthUser {
  return {
    fullName: u.displayName || u.email?.split('@')[0] || 'Student',
    email: u.email || '',
    photoURL: u.photoURL,
  };
}

async function loadAndMergeData(uid: string) {
  const remoteData = await loadUserDataFromFirestore(uid);
  if (!remoteData) return;

  const localHistory = storage.getHistory();
  const localBookmarks = storage.getBookmarks();
  const localStudyPlans = storage.getStudyPlans();
  const localTimings = storage.getQuestionTimings();
  const localAchievements = storage.getAchievements();
  const localNotes = storage.getAllQuestionNotes();
  const localImported = storage.getImportedQuestions();

  if (localHistory.length === 0 && remoteData.history?.length) storage.setHistory(remoteData.history);
  if (localBookmarks.length === 0 && remoteData.bookmarks?.length) storage.setBookmarks(remoteData.bookmarks);
  if (localStudyPlans.length === 0 && remoteData.studyPlans?.length) storage.setStudyPlans(remoteData.studyPlans);
  if (localTimings.length === 0 && remoteData.questionTimings?.length) storage.setQuestionTimings(remoteData.questionTimings);
  if (localAchievements.length === 0 && remoteData.achievements?.length) storage.setAchievements(remoteData.achievements);
  if (Object.keys(localNotes).length === 0 && remoteData.questionNotes && Object.keys(remoteData.questionNotes).length) {
    storage.setAllQuestionNotes(remoteData.questionNotes);
  }
  if (localImported.length === 0 && remoteData.importedQuestions?.length) storage.setImportedQuestions(remoteData.importedQuestions);
  if (!storage.getProfilePhoto() && remoteData.profilePhoto) storage.setProfilePhoto(remoteData.profilePhoto);
  if (!storage.getDisplayName() && remoteData.displayName) storage.setDisplayName(remoteData.displayName);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch((e) => {
      console.error('Redirect result error:', e.code, e.message);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mapped = mapUser(firebaseUser);
        storage.setActiveUserId(firebaseUser.uid);
        storage.setUser(mapped);
        storage.setToken('firebase-' + firebaseUser.uid);

        storage.setOnDataChange(() => {
          scheduleSync(firebaseUser.uid, {
            history: storage.getHistory(),
            bookmarks: storage.getBookmarks(),
            studyPlans: storage.getStudyPlans(),
            questionTimings: storage.getQuestionTimings(),
            achievements: storage.getAchievements(),
            questionNotes: storage.getAllQuestionNotes(),
            importedQuestions: storage.getImportedQuestions(),
            profilePhoto: storage.getProfilePhoto(),
            displayName: storage.getDisplayName(),
          });
        });

        await loadAndMergeData(firebaseUser.uid);
        setUser(mapped);
      } else {
        setUser(null);
        storage.setActiveUserId(null);
        storage.setOnDataChange(null);
        storage.removeToken();
        storage.removeUser();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e: any) {
      console.error('Login error:', e.code, e.message);
      const msg =
        e.code === 'auth/invalid-credential' ? 'Invalid email or password.'
        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
        : e.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : e.code === 'auth/configuration-not-found' ? 'Email sign-in not configured. Enable it in Firebase Console.'
        : `Failed to login (${e.code}).`;
      return { success: false, error: msg };
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    signInWithRedirect(auth, googleProvider).catch((e) => {
      console.error('Google redirect error:', e.code, e.message);
    });
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      setUser(mapUser(auth.currentUser!));
      return { success: true };
    } catch (e: any) {
      console.error('Register error:', e.code, e.message);
      const msg =
        e.code === 'auth/email-already-in-use' ? 'An account with this email already exists.'
        : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
        : e.code === 'auth/configuration-not-found' ? 'Email sign-in not configured. Enable it in Firebase Console.'
        : `Failed to register (${e.code}).`;
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await saveUserDataToFirestore(uid, {
          history: storage.getHistory(),
          bookmarks: storage.getBookmarks(),
          studyPlans: storage.getStudyPlans(),
          questionTimings: storage.getQuestionTimings(),
          achievements: storage.getAchievements(),
          questionNotes: storage.getAllQuestionNotes(),
          importedQuestions: storage.getImportedQuestions(),
          profilePhoto: storage.getProfilePhoto(),
          displayName: storage.getDisplayName(),
        });
      } catch (e) {
        console.error('Failed to save data before logout:', e);
      }
    }
    storage.clearAllUserData();
    storage.setActiveUserId(null);
    storage.setOnDataChange(null);
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
