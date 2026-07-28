import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
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
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mapped = mapUser(firebaseUser);
        storage.setActiveUserId(firebaseUser.uid);
        storage.setUser(mapped);
        if (!storage.getToken()) {
          storage.setToken('firebase-' + firebaseUser.uid);
        }

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

        const remoteData = await loadUserDataFromFirestore(firebaseUser.uid);
        if (remoteData) {
          const localData = {
            history: storage.getHistory(),
            bookmarks: storage.getBookmarks(),
            studyPlans: storage.getStudyPlans(),
            questionTimings: storage.getQuestionTimings(),
            achievements: storage.getAchievements(),
            questionNotes: storage.getAllQuestionNotes(),
            importedQuestions: storage.getImportedQuestions(),
            profilePhoto: storage.getProfilePhoto(),
            displayName: storage.getDisplayName(),
          };

          const merged = {
            history: localData.history.length > 0 ? localData.history : (remoteData.history || []),
            bookmarks: localData.bookmarks.length > 0 ? localData.bookmarks : (remoteData.bookmarks || []),
            studyPlans: localData.studyPlans.length > 0 ? localData.studyPlans : (remoteData.studyPlans || []),
            questionTimings: localData.questionTimings.length > 0 ? localData.questionTimings : (remoteData.questionTimings || []),
            achievements: localData.achievements.length > 0 ? localData.achievements : (remoteData.achievements || []),
            questionNotes: Object.keys(localData.questionNotes).length > 0 ? localData.questionNotes : (remoteData.questionNotes || {}),
            importedQuestions: localData.importedQuestions.length > 0 ? localData.importedQuestions : (remoteData.importedQuestions || []),
            profilePhoto: localData.profilePhoto || remoteData.profilePhoto || null,
            displayName: localData.displayName || remoteData.displayName || null,
          };

          storage.setHistory(merged.history);
          storage.setBookmarks(merged.bookmarks);
          storage.setStudyPlans(merged.studyPlans);
          storage.setQuestionTimings(merged.questionTimings);
          storage.setAchievements(merged.achievements);
          storage.setAllQuestionNotes(merged.questionNotes);
          storage.setImportedQuestions(merged.importedQuestions);
          if (merged.profilePhoto) storage.setProfilePhoto(merged.profilePhoto);
          if (merged.displayName) storage.setDisplayName(merged.displayName);
        }

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
      const msg = e.code === 'auth/user-not-found' ? 'No account found with this email.'
        : e.code === 'auth/wrong-password' ? 'Incorrect password.'
        : e.code === 'auth/invalid-credential' ? 'Invalid email or password.'
        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
        : e.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : e.code === 'auth/configuration-not-found' ? 'Email sign-in not configured. Enable it in Firebase Console → Authentication → Sign-in method.'
        : `Failed to login (${e.code}). Check browser console for details.`;
      return { success: false, error: msg };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    } catch (e: any) {
      console.error('Google sign-in error:', e.code, e.message);
      const msg = e.code === 'auth/configuration-not-found' ? 'Google sign-in not configured. Enable it in Firebase Console.'
        : e.code === 'auth/operation-not-allowed' ? 'Google sign-in not enabled. Enable it in Firebase Console.'
        : e.code === 'auth/unauthorized-domain' ? 'This domain is not authorized. Add it in Firebase Console.'
        : `Failed to sign in with Google (${e.code}). Check console for details.`;
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      setUser(mapUser(auth.currentUser!));
      return { success: true };
    } catch (e: any) {
      console.error('Register error:', e.code, e.message);
      const msg = e.code === 'auth/email-already-in-use' ? 'An account with this email already exists.'
        : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
        : e.code === 'auth/configuration-not-found' ? 'Email sign-in not configured. Enable it in Firebase Console → Authentication → Sign-in method.'
        : `Failed to register (${e.code}). Check browser console for details.`;
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
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
    }
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
