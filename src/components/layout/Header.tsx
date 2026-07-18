import { useState, useEffect, useCallback } from 'react';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  Search,
  Sun,
  Moon,
  FileText,
  HelpCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { SUBJECT_NAMES } from '@/data/subjects';
import { db } from '@/lib/db';

const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i);

export default function Header() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const selectedSubject = useAppStore((s) => s.selectedSubject);
  const setSelectedSubject = useAppStore((s) => s.setSelectedSubject);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const setSelectedYear = useAppStore((s) => s.setSelectedYear);

  const totalQuestions = useLiveQuery(() => db.questions.count(), [], 0);
  const papersImported = useLiveQuery(() => db.papers.count(), [], 0);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center gap-3 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-indigo-100 dark:border-indigo-900/40 transition-all duration-300 ease-in-out"
      style={{
        left: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)',
        height: 'var(--header-height)',
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 dark:text-indigo-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search questions, topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full pl-9 pr-8 py-1.5 rounded-lg text-sm
            bg-indigo-50/80 dark:bg-indigo-950/40
            border border-indigo-200/60 dark:border-indigo-800/40
            text-slate-800 dark:text-indigo-100
            placeholder:text-indigo-400/60 dark:placeholder:text-indigo-500/50
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
            transition-all duration-200
          "
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="hidden md:flex items-center gap-2">
        {/* Year Selector */}
        <div className="relative">
          <select
            value={selectedYear ?? ''}
            onChange={(e) =>
              setSelectedYear(e.target.value ? Number(e.target.value) : null)
            }
            className="
              appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium
              bg-indigo-50/80 dark:bg-indigo-950/40
              border border-indigo-200/60 dark:border-indigo-800/40
              text-slate-700 dark:text-indigo-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              cursor-pointer transition-all duration-200
            "
          >
            <option value="">All Years</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" />
        </div>

        {/* Subject Selector */}
        <div className="relative">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="
              appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium
              bg-indigo-50/80 dark:bg-indigo-950/40
              border border-indigo-200/60 dark:border-indigo-800/40
              text-slate-700 dark:text-indigo-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              cursor-pointer transition-all duration-200
              max-w-[180px]
            "
          >
            <option value="">All Subjects</option>
            {SUBJECT_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" />
        </div>

        {/* Active filter indicator */}
        {(selectedYear || selectedSubject) && (
          <button
            onClick={() => {
              setSelectedYear(null);
              setSelectedSubject('');
            }}
            className="px-2 py-1 rounded-md text-[11px] font-medium
              bg-indigo-100 dark:bg-indigo-900/50
              text-indigo-600 dark:text-indigo-300
              hover:bg-indigo-200 dark:hover:bg-indigo-800/50
              transition-colors duration-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Right Section: Stats & Theme */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Stats */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 dark:text-indigo-400/60">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              <span className="font-semibold text-slate-700 dark:text-indigo-300">
                {totalQuestions}
              </span>{' '}
              questions
            </span>
          </div>
          <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800/40" />
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>
              <span className="font-semibold text-slate-700 dark:text-indigo-300">
                {papersImported}
              </span>{' '}
              papers
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="
            flex items-center justify-center w-8 h-8 rounded-lg
            bg-indigo-50 dark:bg-indigo-900/40
            border border-indigo-200/60 dark:border-indigo-800/40
            text-indigo-500 dark:text-indigo-400
            hover:bg-indigo-100 dark:hover:bg-indigo-800/50
            hover:text-indigo-700 dark:hover:text-indigo-200
            transition-all duration-200
          "
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
