import { useState } from 'react';
import { AuthContext } from './AuthContext';
import type { ReactNode } from 'react';
import type { AuthUser } from './AuthContext';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored || stored === 'undefined') return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      // Corrupt/legacy value — drop it so the app can boot.
      localStorage.removeItem('user');
      return null;
    }
  });

  function login(token: string, user: AuthUser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: user !== null }}>
      {children}
    </AuthContext.Provider>
  );
}
