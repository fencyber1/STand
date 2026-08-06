import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { storage } from '../services/storage';
import { loadUserDataFromFirestore, saveUserDataToFirestore, scheduleSync } from '../services/firestoreSync';
import { upsertUserProfile } from '../services/socialService';
import { requestPushPermission } from '../services/pushService';

interface AuthUser {
  uid: string;
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
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  deleteAccount: async () => ({ success: false }),
});

function mapUser(u: FirebaseUser): AuthUser {
  return {
    uid: u.uid,
    fullName: u.displayName || u.email?.split('@')[0] || 'Student',
    email: u.email || '',
    photoURL: u.photoURL,
  };
}

async function loadAndMergeData(uid: string) {
  try {
    const remoteData = await loadUserDataFromFirestore(uid);
    if (!remoteData) return;

    const localHistory = storage.getHistory();
    const localBookmarks = storage.getBookmarks();
    const localStudyPlans = storage.getStudyPlans();
    const localTimings = storage.getQuestionTimings();
    const localAchievements = storage.getAchievements();
    const localNotes = storage.getAllQuestionNotes();
    const localImported = storage.getImportedQuestions();
    const localSavedDocs = storage.getSavedDocuments();

    if (localHistory.length === 0 && remoteData.history?.length) storage.setHistory(remoteData.history);
    if (localBookmarks.length === 0 && remoteData.bookmarks?.length) storage.setBookmarks(remoteData.bookmarks);
    if (localStudyPlans.length === 0 && remoteData.studyPlans?.length) storage.setStudyPlans(remoteData.studyPlans);
    if (localTimings.length === 0 && remoteData.questionTimings?.length) storage.setQuestionTimings(remoteData.questionTimings);
    if (localAchievements.length === 0 && remoteData.achievements?.length) storage.setAchievements(remoteData.achievements);
    if (Object.keys(localNotes).length === 0 && remoteData.questionNotes && Object.keys(remoteData.questionNotes).length) {
      storage.setAllQuestionNotes(remoteData.questionNotes);
    }
    if (localImported.length === 0 && remoteData.importedQuestions?.length) storage.setImportedQuestions(remoteData.importedQuestions);
    if (localSavedDocs.length === 0 && remoteData.savedDocuments?.length) {
      for (const d of remoteData.savedDocuments) storage.saveDocument(d);
    }
    if (!storage.getProfilePhoto() && remoteData.profilePhoto) storage.setProfilePhoto(remoteData.profilePhoto);
    if (!storage.getDisplayName() && remoteData.displayName) storage.setDisplayName(remoteData.displayName);
    if (!storage.getBio() && remoteData.bio) storage.setBio(remoteData.bio);
    if (!storage.getSurname() && remoteData.surname) storage.setSurname(remoteData.surname);
    if (!storage.getRole() && remoteData.role) storage.setRole(remoteData.role);
    if (!storage.getHobby() && remoteData.hobby) storage.setHobby(remoteData.hobby);
    if (!storage.getCountry() && remoteData.country) storage.setCountry(remoteData.country);
  } catch (e) {
    console.error('Failed to merge remote data:', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result from Google sign-in on mobile
    getRedirectResult(auth).catch(() => {});

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
            savedDocuments: storage.getSavedDocuments(),
            profilePhoto: storage.getProfilePhoto(),
            displayName: storage.getDisplayName(),
            bio: storage.getBio(),
            surname: storage.getSurname(),
            role: storage.getRole(),
            hobby: storage.getHobby(),
            country: storage.getCountry(),
          });
        });

        await loadAndMergeData(firebaseUser.uid);

        upsertUserProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email || '',
          status: 'Available',
        }).catch(() => {});

        // Request push notification permission
        requestPushPermission(firebaseUser.uid).catch(() => {});

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
        : e.code === 'auth/configuration-not-found' ? 'Email sign-in is not available. Please try Google sign-in.'
        : 'An error occurred. Please try again.';
      return { success: false, error: msg };
    }
  }, []);

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  const loginWithGoogle = useCallback(async () => {
    try {
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
        return { success: true };
      }
      try {
        await signInWithPopup(auth, googleProvider);
        return { success: true };
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          console.log('[Auth] Popup blocked, falling back to redirect');
          await signInWithRedirect(auth, googleProvider);
          return { success: true };
        }
        throw popupError;
      }
    } catch (e: any) {
      console.error('Google sign-in error:', e.code, e.message);
      const msg =
        e.code === 'auth/popup-blocked' ? 'Popup was blocked by your browser. Allow popups and try again.'
        : e.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled. Please try again.'
        : e.code === 'auth/cancelled-popup-request' ? 'Sign-in cancelled. Please try again.'
        : e.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
        : e.code === 'auth/configuration-not-found' ? 'Google sign-in is not available. Please try email sign-in.'
        : 'Failed to sign in with Google. Please try again.';
      return { success: false, error: msg };
    }
  }, [isMobile]);

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
        : e.code === 'auth/configuration-not-found' ? 'Email registration is not available. Please try Google sign-in.'
        : 'An error occurred. Please try again.';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await Promise.race([
          saveUserDataToFirestore(uid, {
            history: storage.getHistory(),
            bookmarks: storage.getBookmarks(),
            studyPlans: storage.getStudyPlans(),
            questionTimings: storage.getQuestionTimings(),
            achievements: storage.getAchievements(),
            questionNotes: storage.getAllQuestionNotes(),
            importedQuestions: storage.getImportedQuestions(),
            savedDocuments: storage.getSavedDocuments(),
            profilePhoto: storage.getProfilePhoto(),
            displayName: storage.getDisplayName(),
            bio: storage.getBio(),
            surname: storage.getSurname(),
            role: storage.getRole(),
            hobby: storage.getHobby(),
            country: storage.getCountry(),
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000)),
        ]);
      } catch (e) {
        console.error('Failed to save data before logout:', e);
      }
    }
    // Sign out first, then clear local data
    await signOut(auth);
    storage.clearAllUserData();
    storage.setActiveUserId(null);
    storage.setOnDataChange(null);
  }, []);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return { success: false, error: 'No user signed in' };

    try {
      // Delete all user data from Firestore
      const { db } = await import('../services/firebase');
      const { doc, deleteDoc, collection, getDocs, query, where } = await import('firebase/firestore');

      // Delete user data document
      await deleteDoc(doc(db, 'users', firebaseUser.uid));

      // Delete FenBot conversations
      const fenbotQuery = query(collection(db, 'fenbotConversations'), where('uid', '==', firebaseUser.uid));
      const fenbotSnap = await getDocs(fenbotQuery);
      for (const d of fenbotSnap.docs) await deleteDoc(d.ref);

      // Delete study plan conversations
      const studyPlanQuery = query(collection(db, 'studyPlanConversations'), where('uid', '==', firebaseUser.uid));
      const studyPlanSnap = await getDocs(studyPlanQuery);
      for (const d of studyPlanSnap.docs) await deleteDoc(d.ref);

      // Delete from users collection (social)
      await deleteDoc(doc(db, 'users', firebaseUser.uid)).catch(() => {});

      // Delete Firebase Auth account
      await deleteUser(firebaseUser);

      // Clear local data
      storage.clearAllUserData();
      storage.setActiveUserId(null);
      storage.setOnDataChange(null);
      storage.removeToken();
      storage.removeUser();

      return { success: true };
    } catch (e: any) {
      console.error('Delete account error:', e.code, e.message);
      const msg =
        e.code === 'auth/requires-recent-login' ? 'Please log in again before deleting your account.'
        : e.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
        : 'Failed to delete account. Please try again.';
      return { success: false, error: msg };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, loading, login, loginWithGoogle, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
