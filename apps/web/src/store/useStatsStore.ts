'use client';
import { create } from 'zustand';
import type { UserStats } from '../types';

interface StatsState {
  stats:    UserStats | null;
  loading:  boolean;
  setStats: (s: UserStats) => void;
  setLoading: (v: boolean) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats:      null,
  loading:    false,
  setStats:   (stats)   => set({ stats }),
  setLoading: (loading) => set({ loading }),
}));
