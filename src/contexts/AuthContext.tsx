import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { storage } from '../services/storage';

interface AuthUser {
  fullName: string;
  email: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (fullName: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
});

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!storage.getToken());
  const [user, setUser] = useState<AuthUser | null>(() => storage.getUser());

  const login = useCallback((email: string, password: string): { success: boolean; error?: string } => {
    const users = storage.getUsers();
    const found = users.find((u) => u.email === email);

    if (!found) {
      return { success: false, error: 'No account found with this email. Please register first.' };
    }

    if (found.passwordHash !== hashPassword(password)) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    storage.setToken('mock-token-' + Date.now());
    storage.setUser({ fullName: found.fullName, email: found.email });
    setUser({ fullName: found.fullName, email: found.email });
    setIsLoggedIn(true);
    return { success: true };
  }, []);

  const register = useCallback((fullName: string, email: string, password: string): { success: boolean; error?: string } => {
    const users = storage.getUsers();

    if (users.some((u) => u.email === email)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser = {
      fullName,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    storage.saveUser(newUser);
    storage.setToken('mock-token-' + Date.now());
    storage.setUser({ fullName, email });
    setUser({ fullName, email });
    setIsLoggedIn(true);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    storage.removeToken();
    storage.removeUser();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
