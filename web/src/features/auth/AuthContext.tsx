import { createContext, useContext } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'user';
};

export interface AuthContextType {
  user: AuthUser | null;
  login(token: string, user: AuthUser): void;
  logout(): void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
