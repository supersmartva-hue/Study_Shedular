'use client';
import { create } from 'zustand';
import type { StudyItem } from '../types';

interface StudyState {
  items:   StudyItem[];
  loading: boolean;
  setItems:   (items: StudyItem[]) => void;
  addItem:    (item: StudyItem) => void;
  updateItem: (id: string, data: Partial<StudyItem>) => void;
  removeItem: (id: string) => void;
  setLoading: (v: boolean) => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  items:   [],
  loading: false,
  setItems:   (items)    => set({ items }),
  addItem:    (item)     => set(s => ({ items: [item, ...s.items] })),
  updateItem: (id, data) => set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...data } : i) })),
  removeItem: (id)       => set(s => ({ items: s.items.filter(i => i.id !== id) })),
  setLoading: (loading)  => set({ loading }),
}));
