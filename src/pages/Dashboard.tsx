import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  FileText,
  HelpCircle,
  AlertTriangle,
  Bookmark,
  Layers,
  Target,
  Upload,
  Play,
  BarChart3,
  ListChecks,
  Clock,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { db } from '@/lib/db';
import type { Paper, Question, Attempt } from '@/types';

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string; // tailwind bg class for the icon ring
  accent: string; // tailwind text class for value
}

function StatCard({ icon, value, label, color, accent }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 transition-all hover:shadow-lg hover:shadow-indigo-500/5">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-110`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{label}</p>
        </div>
      </div>
      {/* decorative gradient blob */}
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${color} opacity-10 blur-2xl`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick action button                                                */
/* ------------------------------------------------------------------ */

interface ActionBtnProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  gradient: string;
}

function ActionBtn({ to, icon, label, desc, gradient }: ActionBtnProps) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] p-4 transition-all hover:border-transparent hover:shadow-lg ${gradient}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:bg-white/20 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-white transition-colors">{label}</p>
        <p className="text-xs text-[var(--color-text-secondary)] group-hover:text-white/70 transition-colors">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-white/50 transition-all group-hover:translate-x-1" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart palette                                                      */
/* ------------------------------------------------------------------ */

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899'];
const BAR_GRADIENT_ID = 'barGrad';

function BarGradientDef() {
  return (
    <defs>
      <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom recharts tooltip                                            */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-[var(--color-text-primary)]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[var(--color-text-secondary)]">
          {p.name}: <span className="font-semibold text-indigo-400">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 ${className}`}
    >
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
        <Sparkles className="h-7 w-7 text-indigo-400" />
      </div>
      <p className="mb-4 max-w-xs text-sm text-[var(--color-text-secondary)]">{message}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard page                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  /* ---------- live queries ---------- */
  const papers = useLiveQuery(() => db.papers.toArray()) as Paper[] | undefined;
  const questions = useLiveQuery(() => db.questions.toArray()) as Question[] | undefined;
  const attempts = useLiveQuery(() => db.attempts.toArray()) as Attempt[] | undefined;

  const loading = papers === undefined || questions === undefined || attempts === undefined;
  const hasData = !loading && questions.length > 0;

  /* ---------- derived stats ---------- */
  const stats = useMemo(() => {
    if (!hasData) return null;
    const needsReview = questions.filter((q) => q.needsReview).length;
    const bookmarked = questions.filter((q) => q.bookmarked).length;
    const subjects = new Set(questions.map((q) => q.subject).filter(Boolean));
    const correctAttempts = attempts!.filter((a) => a.isCorrect).length;
    const accuracy = attempts!.length > 0 ? Math.round((correctAttempts / attempts!.length) * 100) : 0;

    return {
      totalPapers: papers!.length,
      totalQuestions: questions.length,
      needsReview,
      bookmarked,
      subjectsCovered: subjects.size,
      accuracy,
    };
  }, [papers, questions, attempts, hasData]);

  /* ---------- recent imports ---------- */
  const recentPapers = useMemo(() => {
    if (!papers?.length) return [];
    return [...papers].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()).slice(0, 5);
  }, [papers]);

  /* ---------- subject coverage data ---------- */
  const subjectData = useMemo(() => {
    if (!hasData) return [];
    const map = new Map<string, number>();
    questions.forEach((q) => {
      if (q.subject) map.set(q.subject, (map.get(q.subject) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 20) + '...' : name, count }))
      .sort((a, b) => b.count - a.count);
  }, [questions, hasData]);

  /* ---------- year distribution ---------- */
  const yearData = useMemo(() => {
    if (!hasData) return [];
    const map = new Map<number, number>();
    questions.forEach((q) => {
      if (q.year) map.set(q.year, (map.get(q.year) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([year, count]) => ({ year: String(year), count }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [questions, hasData]);

  /* ---------- difficulty distribution ---------- */
  const difficultyData = useMemo(() => {
    if (!hasData) return [];
    const map = new Map<string, number>();
    questions.forEach((q) => {
      const d = q.difficulty || 'unknown';
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [questions, hasData]);

  /* ---------- render ---------- */
  return (
    <div className="fade-in space-y-8">
      {/* ---- Welcome banner ---- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-white/90" />
            <h1 className="text-2xl font-bold text-white">GATE CSE Master</h1>
          </div>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/80">
            Your intelligent companion for GATE Computer Science preparation. Import previous year
            papers, practice topic-wise, track your progress, and master every concept with
            AI-powered analytics.
          </p>
        </div>
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -right-4 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-white/5" />
      </div>

      {/* ---- Stat cards ---- */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            />
          ))}
        </div>
      ) : hasData && stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            icon={<FileText className="h-5 w-5 text-indigo-300" />}
            value={stats.totalPapers}
            label="Total Papers"
            color="bg-indigo-500/15"
            accent="text-indigo-400"
          />
          <StatCard
            icon={<HelpCircle className="h-5 w-5 text-purple-300" />}
            value={stats.totalQuestions}
            label="Total Questions"
            color="bg-purple-500/15"
            accent="text-purple-400"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-300" />}
            value={stats.needsReview}
            label="Needs Review"
            color="bg-amber-500/15"
            accent="text-amber-400"
          />
          <StatCard
            icon={<Bookmark className="h-5 w-5 text-rose-300" />}
            value={stats.bookmarked}
            label="Bookmarked"
            color="bg-rose-500/15"
            accent="text-rose-400"
          />
          <StatCard
            icon={<Layers className="h-5 w-5 text-emerald-300" />}
            value={stats.subjectsCovered}
            label="Subjects Covered"
            color="bg-emerald-500/15"
            accent="text-emerald-400"
          />
          <StatCard
            icon={<Target className="h-5 w-5 text-cyan-300" />}
            value={`${stats.accuracy}%`}
            label="Accuracy"
            color="bg-cyan-500/15"
            accent="text-cyan-400"
          />
        </div>
      ) : null}

      {/* ---- Quick actions ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionBtn
          to="/import"
          icon={<Upload className="h-5 w-5" />}
          label="Import Papers"
          desc="Upload GATE PDFs or ZIPs"
          gradient="hover:bg-gradient-to-br hover:from-indigo-600 hover:to-indigo-700"
        />
        <ActionBtn
          to="/practice"
          icon={<Play className="h-5 w-5" />}
          label="Start Practice"
          desc="Topic-wise or year-wise"
          gradient="hover:bg-gradient-to-br hover:from-purple-600 hover:to-purple-700"
        />
        <ActionBtn
          to="/analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          label="View Analytics"
          desc="Performance insights"
          gradient="hover:bg-gradient-to-br hover:from-fuchsia-600 hover:to-fuchsia-700"
        />
        <ActionBtn
          to="/review"
          icon={<ListChecks className="h-5 w-5" />}
          label="Review Queue"
          desc="Flagged questions"
          gradient="hover:bg-gradient-to-br hover:from-rose-600 hover:to-rose-700"
        />
      </div>

      {/* ---- Charts + recent imports ---- */}
      {!hasData ? (
        <EmptyState
          message="No papers imported yet. Upload GATE previous year papers to get started with your preparation journey."
          cta="Import Your First Paper"
          to="/import"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subject coverage */}
          <Section title="Subject Coverage" className="lg:row-span-2">
            <div style={{ height: Math.max(280, subjectData.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <BarGradientDef />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Questions" fill={`url(#${BAR_GRADIENT_ID})`} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Year-wise distribution */}
          <Section title="Year-wise Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <BarGradientDef />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Questions" fill={`url(#${BAR_GRADIENT_ID})`} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Difficulty distribution */}
          <Section title="Difficulty Distribution">
            <div className="flex h-64 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {difficultyData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2">
                {difficultyData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[var(--color-text-secondary)]">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Recent imports */}
          {recentPapers.length > 0 && (
            <Section title="Recent Imports" className="lg:col-span-2">
              <div className="divide-y divide-[var(--color-border)]">
                {recentPapers.map((paper) => (
                  <div key={paper.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                      <FileText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {paper.filename}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {paper.year} &middot; {paper.totalQuestions} questions &middot; {paper.totalMarks} marks
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          paper.status === 'done'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : paper.status === 'error'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {paper.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        {new Date(paper.importedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
