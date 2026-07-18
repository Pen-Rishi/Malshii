import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Grid3X3,
  AlertTriangle,
  Trophy,
  FileQuestion,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics } from '@/hooks/useQuestions';
import { SUBJECT_NAMES } from '@/data/subjects';

const CHART_COLORS = [
  '#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#4338ca',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#3b82f6', '#60a5fa',
  '#2dd4bf', '#34d399', '#c084fc',
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
};

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const CustomTooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
};

export default function AnalyticsPage() {
  const analytics = useAnalytics();

  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    SUBJECT_NAMES.forEach((name, i) => {
      map[name] = CHART_COLORS[i % CHART_COLORS.length];
    });
    return map;
  }, []);

  const topTopics = useMemo(() => {
    if (!analytics) return [];
    return analytics.topicFrequency.slice(0, 20);
  }, [analytics]);

  const yearTrendSubjects = useMemo(() => {
    if (!analytics) return [];
    const subjects = new Set<string>();
    for (const yt of analytics.yearTrends) {
      for (const s of Object.keys(yt.subjects)) {
        subjects.add(s);
      }
    }
    return Array.from(subjects);
  }, [analytics]);

  const yearTrendData = useMemo(() => {
    if (!analytics) return [];
    return analytics.yearTrends.map((yt) => ({
      year: yt.year,
      ...yt.subjects,
    }));
  }, [analytics]);

  // Coverage matrix: find max count for color scaling
  const maxCoverageCount = useMemo(() => {
    if (!analytics) return 1;
    let max = 1;
    for (const row of analytics.coverageMatrix) {
      for (const t of row.topics) {
        if (t.count > max) max = t.count;
      }
    }
    return max;
  }, [analytics]);

  if (analytics === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <FileQuestion className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Analytics Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Import question papers and start practicing to see detailed analytics
              about your preparation progress.
            </p>
            <Link
              to="/import"
              className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Import Papers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Detailed insights into your GATE CSE preparation
          </p>
        </div>

        <div className="space-y-6">
          {/* Row 1: Subject Weightage + Difficulty Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Weightage */}
            <div className="lg:col-span-2">
              <SectionCard title="Subject Weightage" icon={BarChart3}>
                <div style={{ height: Math.max(360, analytics.subjectWeightage.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.subjectWeightage}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                      <YAxis
                        dataKey="subject"
                        type="category"
                        width={180}
                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      />
                      <Tooltip
                        contentStyle={CustomTooltipStyle}
                        formatter={(value: any, name: any) => {
                          if (name === 'count') return [value, 'Questions'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {analytics.subjectWeightage.map((entry, index) => (
                          <Cell
                            key={entry.subject}
                            fill={subjectColorMap[entry.subject] || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            {/* Difficulty Distribution */}
            <SectionCard title="Difficulty Distribution" icon={PieChartIcon}>
              <div className="h-[300px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.difficultyDistribution}
                      dataKey="count"
                      nameKey="difficulty"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      strokeWidth={2}
                      stroke="var(--color-surface)"
                    >
                      {analytics.difficultyDistribution.map((entry) => (
                        <Cell
                          key={entry.difficulty}
                          fill={DIFFICULTY_COLORS[entry.difficulty] || '#6366f1'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CustomTooltipStyle}
                      formatter={(value: any, name: any) => [
                        `${value} questions`,
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value.charAt(0).toUpperCase() + value.slice(1)
                      }
                      wrapperStyle={{ fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Row 2: Topic Frequency */}
          <SectionCard title="Top 20 Most Frequent Topics" icon={TrendingUp}>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topTopics}
                  margin={{ top: 0, right: 20, bottom: 60, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="topic"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip
                    contentStyle={CustomTooltipStyle}
                    formatter={(value: any) => [value, 'Questions']}
                    labelFormatter={(label: any) => {
                      const item = topTopics.find((t) => t.topic === label);
                      return item ? `${label} (${item.subject})` : label;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {topTopics.map((entry, index) => (
                      <Cell
                        key={`${entry.subject}-${entry.topic}`}
                        fill={subjectColorMap[entry.subject] || CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Row 3: Year Trends + Marks Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Year Trends */}
            <SectionCard title="Year-wise Trends" icon={TrendingUp}>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      iconSize={10}
                    />
                    {yearTrendSubjects.map((subject, i) => (
                      <Line
                        key={subject}
                        type="monotone"
                        dataKey={subject}
                        stroke={subjectColorMap[subject] || CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Marks Distribution */}
            <SectionCard title="Marks Distribution" icon={BarChart3}>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.marksDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="marks"
                      tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                      label={{ value: 'Marks', position: 'insideBottom', offset: -2, style: { fontSize: 12, fill: 'var(--color-text-muted)' } }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                      label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--color-text-muted)' } }}
                    />
                    <Tooltip
                      contentStyle={CustomTooltipStyle}
                      formatter={(value: any) => [value, 'Questions']}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {analytics.marksDistribution.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Row 4: Weak Areas + Strong Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weak Areas */}
            <SectionCard title="Weak Areas" icon={AlertTriangle}>
              {analytics.weakAreas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  Attempt at least 2 questions per topic to see weak areas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Topic</th>
                        <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                        <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Accuracy</th>
                        <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Attempted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.weakAreas.map((area) => (
                        <tr
                          key={`${area.subject}-${area.topic}`}
                          className="border-b border-gray-100 dark:border-gray-800/50 last:border-0"
                        >
                          <td className="py-2.5 px-3 text-gray-900 dark:text-white font-medium">
                            {area.topic}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 text-xs">
                            {area.subject}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                area.accuracy < 40
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                                  : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                              }`}
                            >
                              {area.accuracy}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500 dark:text-gray-400">
                            {area.attempted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Strong Areas */}
            <SectionCard title="Strong Areas" icon={Trophy}>
              {analytics.strongAreas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  Attempt at least 2 questions per topic to see strong areas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Topic</th>
                        <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                        <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Accuracy</th>
                        <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400">Attempted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.strongAreas.map((area) => (
                        <tr
                          key={`${area.subject}-${area.topic}`}
                          className="border-b border-gray-100 dark:border-gray-800/50 last:border-0"
                        >
                          <td className="py-2.5 px-3 text-gray-900 dark:text-white font-medium">
                            {area.topic}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 text-xs">
                            {area.subject}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              {area.accuracy}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500 dark:text-gray-400">
                            {area.attempted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Row 5: Coverage Matrix */}
          <SectionCard title="Coverage Matrix" icon={Grid3X3}>
            {analytics.coverageMatrix.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No coverage data available yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="space-y-3 min-w-[600px]">
                  {analytics.coverageMatrix.map((row) => (
                    <div key={row.subject}>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 truncate">
                        {row.subject}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.topics.map((topic) => {
                          const intensity = topic.count / maxCoverageCount;
                          let bgClass = 'bg-gray-100 dark:bg-gray-800';
                          if (topic.count > 0) {
                            if (intensity > 0.7) {
                              bgClass = 'bg-indigo-700 dark:bg-indigo-600';
                            } else if (intensity > 0.4) {
                              bgClass = 'bg-indigo-500 dark:bg-indigo-500';
                            } else if (intensity > 0.15) {
                              bgClass = 'bg-indigo-300 dark:bg-indigo-700';
                            } else {
                              bgClass = 'bg-indigo-100 dark:bg-indigo-900';
                            }
                          }
                          return (
                            <div
                              key={topic.name}
                              className={`group relative px-2.5 py-1.5 rounded-md text-xs cursor-default ${bgClass} ${
                                topic.count > 0 && intensity > 0.4
                                  ? 'text-white'
                                  : 'text-gray-600 dark:text-gray-300'
                              }`}
                              title={`${topic.name}: ${topic.count} questions`}
                            >
                              <span className="truncate max-w-[120px] inline-block align-middle">
                                {topic.name}
                              </span>
                              <span className="ml-1 opacity-70">({topic.count})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Coverage:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-900" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-indigo-300 dark:bg-indigo-700" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Medium</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-indigo-500 dark:bg-indigo-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">High</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-indigo-700 dark:bg-indigo-600" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Very High</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
