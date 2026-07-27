import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { storage } from '../services/storage';

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mapped = mapUser(firebaseUser);
        setUser(mapped);
        storage.setActiveUserId(firebaseUser.uid);
        storage.setUser(mapped);
        if (!storage.getToken()) {
          storage.setToken('firebase-' + firebaseUser.uid);
        }
      } else {
        setUser(null);
        storage.setActiveUserId(null);
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
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (e: any) {
      console.error('Google sign-in error:', e.code, e.message);
      const msg = e.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled.'
        : e.code === 'auth/popup-blocked' ? 'Popup blocked. Allow popups for this site.'
        : e.code === 'auth/configuration-not-found' ? 'Google sign-in not configured in Firebase. Enable it in Console → Authentication → Sign-in method.'
        : e.code === 'auth/operation-not-allowed' ? 'Google sign-in not enabled. Enable it in Firebase Console.'
        : e.code === 'auth/unauthorized-domain' ? 'This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains.'
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
