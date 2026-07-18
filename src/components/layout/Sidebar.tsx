import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Home,
  Upload,
  BookOpen,
  MessageSquareText,
  BarChart3,
  Dumbbell,
  RotateCcw,
  Bookmark,
  StickyNote,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { GATE_SUBJECTS } from '@/data/subjects';
import { db } from '@/lib/db';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/questions', icon: MessageSquareText, label: 'Questions' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/practice', icon: Dumbbell, label: 'Practice' },
  { to: '/review', icon: RotateCcw, label: 'Review' },
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/export', icon: Download, label: 'Export' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export default function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const totalQuestions = useLiveQuery(() => db.questions.count(), [], 0);
  const needsReviewCount = useLiveQuery(
    () => db.questions.where('needsReview').equals(1).count(),
    [],
    0
  );

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-screen flex flex-col
        bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900
        dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950
        border-r border-indigo-800/30 dark:border-indigo-900/40
        shadow-xl shadow-indigo-950/20
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-indigo-800/30">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
              GATE CSE
            </h1>
            <p className="text-[11px] font-medium text-indigo-300/80 tracking-wide">
              Master
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 relative
              ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/25'
                  : 'text-indigo-200/70 hover:bg-indigo-800/40 hover:text-white'
              }
              ${!sidebarOpen ? 'justify-center px-0' : ''}
              `
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
            {!sidebarOpen && (
              <div
                className="
                  absolute left-full ml-2 px-2.5 py-1 rounded-md
                  bg-slate-900 text-white text-xs font-medium
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150 whitespace-nowrap z-50
                  shadow-lg border border-indigo-800/30
                "
              >
                {label}
              </div>
            )}
          </NavLink>
        ))}

        {/* Subject Quick Links */}
        {sidebarOpen && (
          <div className="pt-4 mt-3 border-t border-indigo-800/30">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-400/60">
              Subjects
            </p>
            <div className="space-y-0.5">
              {GATE_SUBJECTS.map((subject) => (
                <NavLink
                  key={subject.name}
                  to={`/subjects/${encodeURIComponent(subject.name)}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px]
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-indigo-600/70 text-white'
                        : 'text-indigo-300/60 hover:bg-indigo-800/30 hover:text-indigo-200'
                    }`
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 flex-shrink-0" />
                  <span className="truncate">{subject.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Stats at Bottom */}
      <div className="border-t border-indigo-800/30 px-3 py-3 space-y-2">
        {sidebarOpen ? (
          <>
            <div className="flex items-center gap-2 text-xs text-indigo-300/70">
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                <span className="font-semibold text-indigo-200">
                  {totalQuestions}
                </span>{' '}
                questions
              </span>
            </div>
            {(needsReviewCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-400/80">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold text-amber-300">
                    {needsReviewCount}
                  </span>{' '}
                  needs review
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-[10px] font-bold text-indigo-300/60">
            <span>{totalQuestions}</span>
            {(needsReviewCount ?? 0) > 0 && (
              <span className="text-amber-400/80">{needsReviewCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="
          flex items-center justify-center py-2.5
          border-t border-indigo-800/30
          text-indigo-400/60 hover:text-white hover:bg-indigo-800/30
          transition-colors duration-200
        "
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
