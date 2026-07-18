import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Layers,
  Play,
  BarChart3,
  Bookmark,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Hash,
  Star,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { db } from '@/lib/db';
import { GATE_SUBJECTS } from '@/data/subjects';
import type { Question, Note } from '@/types';

const TABS = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'yearwise', label: 'Year-wise', icon: Calendar },
  { key: 'topicwise', label: 'Topic-wise', icon: Layers },
  { key: 'practice', label: 'Practice', icon: Play },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { key: 'notes', label: 'Notes', icon: StickyNote },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#7c3aed', '#4f46e5'];

export default function SubjectDetailPage() {
  const { subject: rawSubject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const subjectName = decodeURIComponent(rawSubject ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const subjectData = GATE_SUBJECTS.find((s) => s.name === subjectName);

  const questions = useLiveQuery(
    () => db.questions.where('subject').equals(subjectName).toArray(),
    [subjectName],
  ) ?? [];

  const bookmarks = useLiveQuery(async () => {
    const qIds = (await db.questions.where('subject').equals(subjectName).toArray()).filter(q => q.bookmarked).map(q => q.id!);
    return db.questions.where('id').anyOf(qIds).toArray();
  }, [subjectName]) ?? [];

  const notes = useLiveQuery(
    () => db.notes.where('subject').equals(subjectName).toArray(),
    [subjectName],
  ) ?? [];

  const stats = useMemo(() => {
    const total = questions.length;
    const solved = questions.filter((q) => q.solved).length;
    const easy = questions.filter((q) => q.difficulty === 'easy').length;
    const medium = questions.filter((q) => q.difficulty === 'medium').length;
    const hard = questions.filter((q) => q.difficulty === 'hard').length;
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    return { total, solved, easy, medium, hard, totalMarks };
  }, [questions]);

  const topicDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of questions) {
      map[q.topic] = (map[q.topic] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  const difficultyData = useMemo(
    () => [
      { name: 'Easy', value: stats.easy, color: DIFFICULTY_COLORS.easy },
      { name: 'Medium', value: stats.medium, color: DIFFICULTY_COLORS.medium },
      { name: 'Hard', value: stats.hard, color: DIFFICULTY_COLORS.hard },
    ],
    [stats],
  );

  const yearGroups = useMemo(() => {
    const map: Record<number, Question[]> = {};
    for (const q of questions) {
      if (!map[q.year]) map[q.year] = [];
      map[q.year].push(q);
    }
    return Object.entries(map)
      .map(([year, qs]) => ({ year: Number(year), questions: qs.sort((a, b) => a.questionNumber - b.questionNumber) }))
      .sort((a, b) => b.year - a.year);
  }, [questions]);

  const topicGroups = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of questions) {
      if (!map[q.topic]) map[q.topic] = [];
      map[q.topic].push(q);
    }
    return Object.entries(map)
      .map(([topic, qs]) => ({ topic, questions: qs }))
      .sort((a, b) => b.questions.length - a.questions.length);
  }, [questions]);

  const yearTrend = useMemo(() => {
    const map: Record<number, number> = {};
    for (const q of questions) {
      map[q.year] = (map[q.year] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [questions]);

  const bookmarkedQuestions = useMemo(
    () => questions.filter((q) => q.bookmarked),
    [questions],
  );

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  if (!subjectData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Subject not found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">"{subjectName}" is not a valid GATE CSE subject.</p>
          <Link to="/subjects" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/subjects')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            All Subjects
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {subjectName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {stats.total} questions &middot; {subjectData.topics.length} topics &middot; {stats.totalMarks} marks
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-medium">
                {stats.solved} solved
              </span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                {stats.total - stats.solved} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Questions', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Solved', value: stats.solved, color: 'text-green-600 dark:text-green-400' },
                { label: 'Total Marks', value: stats.totalMarks, color: 'text-purple-600 dark:text-purple-400' },
                { label: 'Topics', value: subjectData.topics.length, color: 'text-amber-600 dark:text-amber-400' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            {stats.total > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Topic Distribution */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Topic Distribution</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topicDistribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-white, #fff)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Difficulty Pie */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Difficulty Breakdown</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={difficultyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {difficultyData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'yearwise' && (
          <div className="space-y-3">
            {yearGroups.length === 0 ? (
              <EmptyState message="No questions found for this subject." />
            ) : (
              yearGroups.map(({ year, questions: qs }) => (
                <div
                  key={year}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">GATE {year}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">
                        {qs.length} questions
                      </span>
                    </div>
                    {expandedYears.has(year) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedYears.has(year) && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                      {qs.map((q) => (
                        <QuestionRow key={q.id} question={q} showTopic />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'topicwise' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectData.topics.map((topic) => {
              const qs = questions.filter((q) => q.topic === topic.name);
              return (
                <Link
                  key={topic.name}
                  to={`/subjects/${encodeURIComponent(subjectName)}/${encodeURIComponent(topic.name)}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {topic.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{qs.length} questions</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{topic.subtopics.length} subtopics</span>
                  </div>
                  {qs.length > 0 && (
                    <div className="mt-3 flex gap-1.5">
                      <DifficultyBadge label="E" count={qs.filter((q) => q.difficulty === 'easy').length} color="green" />
                      <DifficultyBadge label="M" count={qs.filter((q) => q.difficulty === 'medium').length} color="amber" />
                      <DifficultyBadge label="H" count={qs.filter((q) => q.difficulty === 'hard').length} color="red" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center max-w-lg mx-auto">
            <Play className="mx-auto w-12 h-12 text-indigo-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Practice {subjectName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Test your knowledge with {stats.total} questions across {subjectData.topics.length} topics.
            </p>
            <Link
              to={`/practice?subject=${encodeURIComponent(subjectName)}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Practice
            </Link>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {stats.total === 0 ? (
              <EmptyState message="No data available for analytics. Import questions first." />
            ) : (
              <>
                {/* Topic Distribution Bar */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Questions per Topic</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topicDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Difficulty Pie */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Difficulty Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={difficultyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {difficultyData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Year Trend */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Year-wise Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={yearTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ fill: '#6366f1', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="space-y-3">
            {bookmarkedQuestions.length === 0 ? (
              <EmptyState message="No bookmarked questions in this subject." />
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {bookmarkedQuestions.map((q) => (
                  <QuestionRow key={q.id} question={q} showTopic />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {notes.length === 0 ? (
              <EmptyState message="No notes for this subject yet." />
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <StickyNote className="w-3.5 h-3.5" />
                    {note.topic && <span>{note.topic}</span>}
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Shared Sub-components ---- */

function QuestionRow({ question: q, showTopic }: { question: Question; showTopic?: boolean }) {
  return (
    <Link
      to={`/questions/${q.id}`}
      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
          {q.questionNumber}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-gray-900 dark:text-white truncate max-w-md">
            {q.question.slice(0, 80)}{q.question.length > 80 ? '...' : ''}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span>GATE {q.year}</span>
            {showTopic && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="truncate max-w-[120px]">{q.topic}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            q.difficulty === 'easy'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
              : q.difficulty === 'medium'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}
        >
          {q.difficulty}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-medium">
          {q.marks}M
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
          {q.type}
        </span>
      </div>
    </Link>
  );
}

function DifficultyBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[color]}`}>
      {label}:{count}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <FileText className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
