'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user:         User | null;
  token:        string | null;
  refreshToken: string | null;
  isAuth:       boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      token:        null,
      refreshToken: null,
      isAuth:       false,

      setAuth: (user, token, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token',  token);
          localStorage.setItem('refresh_token', refreshToken);
        }
        set({ user, token, refreshToken, isAuth: true });
      },

      updateUser: (partial) =>
        set(s => ({ user: s.user ? { ...s.user, ...partial } : null })),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, token: null, refreshToken: null, isAuth: false });
      },
    }),
    {
      name:    'auth-store',
      partialize: s => ({ user: s.user, token: s.token, refreshToken: s.refreshToken, isAuth: s.isAuth }),
    }
  )
);
