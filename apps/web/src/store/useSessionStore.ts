'use client';
import { create } from 'zustand';
import type { StudySession } from '../types';

interface SessionState {
  sessions:      StudySession[];
  weekStart:     string | null;
  loading:       boolean;
  setSessions:   (s: StudySession[], weekStart: string) => void;
  updateSession: (id: string, data: Partial<StudySession>) => void;
  removeSession: (id: string) => void;
  addSessions:   (s: StudySession[]) => void;
  setLoading:    (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions:    [],
  weekStart:   null,
  loading:     false,
  setSessions: (sessions, weekStart) => set({ sessions, weekStart }),
  updateSession: (id, data) =>
    set(s => ({ sessions: s.sessions.map(x => x.id === id ? { ...x, ...data } : x) })),
  removeSession: (id) =>
    set(s => ({ sessions: s.sessions.filter(x => x.id !== id) })),
  addSessions: (incoming) =>
    set(s => ({ sessions: [...s.sessions, ...incoming] })),
  setLoading: (loading) => set({ loading }),
}));
