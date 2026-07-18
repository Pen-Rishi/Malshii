import { create } from 'zustand';
import type { ImportProgress } from '@/types';

interface AppState {
  sidebarOpen: boolean;
  currentView: string;
  importProgress: ImportProgress | null;
  searchQuery: string;
  selectedSubject: string;
  selectedYear: number | null;
  selectedTopic: string;

  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedYear: (year: number | null) => void;
  setSelectedTopic: (topic: string) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  currentView: 'dashboard',
  importProgress: null,
  searchQuery: '',
  selectedSubject: '',
  selectedYear: null,
  selectedTopic: '',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setImportProgress: (progress) => set({ importProgress: progress }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedSubject: '',
      selectedYear: null,
      selectedTopic: '',
    }),
}));
