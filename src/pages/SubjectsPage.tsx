import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calculator,
  Binary,
  Cpu,
  Database,
  Network,
  Code2,
  TreePine,
  GitBranch,
  Infinity,
  Cog,
  MonitorCog,
  Layers,
  Brain,
} from 'lucide-react';
import { db } from '@/lib/db';
import { GATE_SUBJECTS } from '@/data/subjects';
import type { Question } from '@/types';

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  'General Aptitude': Brain,
  'Engineering Mathematics': Calculator,
  'Discrete Mathematics': Infinity,
  'Digital Logic': Binary,
  'Computer Organization & Architecture': Cpu,
  'Programming in C': Code2,
  'Data Structures': TreePine,
  'Algorithms': GitBranch,
  'Theory of Computation': Cog,
  'Compiler Design': Layers,
  'Operating Systems': MonitorCog,
  'Database Management Systems': Database,
  'Computer Networks': Network,
};

export default function SubjectsPage() {
  const questions = useLiveQuery(() => db.questions.toArray()) ?? [];

  const subjectStats = useMemo(() => {
    const grouped: Record<string, { total: number; solved: number }> = {};
    for (const q of questions) {
      if (!grouped[q.subject]) {
        grouped[q.subject] = { total: 0, solved: 0 };
      }
      grouped[q.subject].total++;
      if (q.solved) grouped[q.subject].solved++;
    }
    return grouped;
  }, [questions]);

  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            GATE CSE Subjects
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {totalQuestions > 0
              ? `${totalQuestions} questions across ${Object.keys(subjectStats).length} subjects`
              : 'Import question papers to get started'}
          </p>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {GATE_SUBJECTS.map((subject) => {
            const Icon = SUBJECT_ICONS[subject.name] ?? Brain;
            const stats = subjectStats[subject.name] ?? { total: 0, solved: 0 };
            const topicCount = subject.topics.length;
            const progress =
              stats.total > 0
                ? Math.round((stats.solved / stats.total) * 100)
                : 0;

            return (
              <Link
                key={subject.name}
                to={`/subjects/${encodeURIComponent(subject.name)}`}
                className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* Icon & Subject Name */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                      {subject.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{stats.total} questions</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span>{topicCount} topics</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Progress
                    </span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {stats.solved}/{stats.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Empty State Badge */}
                {stats.total === 0 && (
                  <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    No questions yet
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Global Empty State */}
        {totalQuestions === 0 && (
          <div className="mt-12 text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <Brain className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No questions imported yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Import GATE CSE question papers to start practicing. Your progress
              will be tracked across all subjects and topics.
            </p>
            <Link
              to="/import"
              className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Import Papers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
