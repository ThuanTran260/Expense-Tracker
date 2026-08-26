import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import api, { setAccessToken } from '../lib/api';

interface UserSettings {
  theme: 'LIGHT' | 'DARK';
  currency: 'VND' | 'USD';
  language: string;
  alertThreshold: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  settings: UserSettings | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────
// BOOTSTRAP SINGLETON — silent refresh khi app khởi động (sau F5)
// Promise nằm ở module scope: React StrictMode double-mount effect 2 lần
// vẫn chỉ chạy ĐÚNG 1 request refresh (nếu tạo promise trong effect, 2 request
// song song mang cùng cookie → reuse detection sẽ thu hồi cả phiên).
// ─────────────────────────────────────────────
let bootstrapPromise: Promise<User | null> | null = null;

function bootstrapSession(): Promise<User | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const { data } = await axios.post(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );
        setAccessToken(data.accessToken);
        const me = await api.get('/auth/me');
        return me.data.user as User;
      } catch {
        // Không có cookie / refresh hết hạn → guest, im lặng (không toast lỗi)
        setAccessToken(null);
        return null;
      }
    })();
  }
  return bootstrapPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Áp dụng theme khi user thay đổi
  useEffect(() => {
    if (user?.settings?.theme) {
      const themeValue = user.settings.theme.toLowerCase();
      document.documentElement.setAttribute('data-theme', themeValue);
      localStorage.setItem('expense_tracker_theme', themeValue);
    }
  }, [user?.settings?.theme]);

  // Kiểm tra phiên khi app khởi động (singleton — an toàn với StrictMode)
  useEffect(() => {
    let cancelled = false;
    bootstrapSession().then((restoredUser) => {
      if (!cancelled) {
        setUser(restoredUser);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      localStorage.removeItem('expense_tracker_theme');
      document.documentElement.removeAttribute('data-theme');
      setUser(null);
    }
  };

  const updateSettings = async (settings: Partial<UserSettings>) => {
    const { data } = await api.put('/settings', settings);
    setUser((prev) => prev ? { ...prev, settings: data.settings } : prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
