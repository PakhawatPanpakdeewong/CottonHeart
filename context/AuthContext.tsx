'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id?: number;
  username: string;
  email?: string;
  loggedIn: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('cottonheart_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.loggedIn) {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Error loading user from localStorage:', error);
        }
      }
      setIsLoading(false);
    }
  }, []);

  // Backfill customer id for older sessions
  useEffect(() => {
    if (!user?.loggedIn) return;
    if (typeof user.id === 'number' && user.id > 0) return;

    const email = user.email || (user.username?.includes('@') ? user.username : undefined);
    if (!email) return;

    const backfill = async () => {
      try {
        const res = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        const id = Number(data?.customerId);
        if (!Number.isFinite(id) || id <= 0) return;

        setUser((prev) => {
          if (!prev) return prev;
          const merged = { ...prev, id };
          localStorage.setItem('cottonheart_user', JSON.stringify(merged));
          return merged;
        });
      } catch {
        // ignore
      }
    };

    backfill();
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) return false;
      const userData: User = {
        id: typeof data.user.id === 'number' ? data.user.id : undefined,
        username: data.user.email,
        email: data.user.email,
        loggedIn: true,
      };
      setUser(userData);
      localStorage.setItem('cottonheart_user', JSON.stringify(userData));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cottonheart_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}





