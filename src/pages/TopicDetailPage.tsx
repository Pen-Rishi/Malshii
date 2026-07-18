import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
  Layers,
} from 'lucide-react';
import { db } from '@/lib/db';
import { GATE_SUBJECTS } from '@/data/subjects';
import type { Question } from '@/types';

export default function TopicDetailPage() {
  const { subject: rawSubject, topic: rawTopic } = useParams<{
    subject: string;
    topic: string;
  }>();
  const subjectName = decodeURIComponent(rawSubject ?? '');
  const topicName = decodeURIComponent(rawTopic ?? '');

  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(
    new Set(),
  );

  const subjectData = GATE_SUBJECTS.find((s) => s.name === subjectName);
  const topicData = subjectData?.topics.find((t) => t.name === topicName);

  const questions =
    useLiveQuery(
      () =>
        db.questions
          .where('[subject+topic]')
          .equals([subjectName, topicName])
          .toArray(),
      [subjectName, topicName],
    ) ?? [];

  const stats = useMemo(() => {
    const total = questions.length;
    const solved = questions.filter((q) => q.solved).length;
    const easy = questions.filter((q) => q.difficulty === 'easy').length;
    const medium = questions.filter((q) => q.difficulty === 'medium').length;
    const hard = questions.filter((q) => q.difficulty === 'hard').length;
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
    return { total, solved, easy, medium, hard, totalMarks };
  }, [questions]);

  const subtopicGroups = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of questions) {
      const key = q.subtopic || 'Uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(q);
    }

    // Order by syllabus order if available, then by count
    const syllabusOrder = topicData?.subtopics.map((st) => st.name) ?? [];
    return Object.entries(map)
      .map(([subtopic, qs]) => ({
        subtopic,
        questions: qs.sort((a, b) => a.year - b.year || a.questionNumber - b.questionNumber),
      }))
      .sort((a, b) => {
        const ai = syllabusOrder.indexOf(a.subtopic);
        const bi = syllabusOrder.indexOf(b.subtopic);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return b.questions.length - a.questions.length;
      });
  }, [questions, topicData]);

  const toggleSubtopic = (subtopic: string) => {
    setExpandedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(subtopic)) next.delete(subtopic);
      else next.add(subtopic);
      return next;
    });
  };

  if (!subjectData || !topicData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Topic not found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Could not find "{topicName}" under "{subjectName}".
          </p>
          <Link
            to="/subjects"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
          >
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
          <Link
            to="/subjects"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Subjects
          </Link>
          <span>/</span>
          <Link
            to={`/subjects/${encodeURIComponent(subjectName)}`}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {subjectName}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {topicName}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {topicName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subjectName}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Questions', value: stats.total, accent: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Solved', value: stats.solved, accent: 'text-green-600 dark:text-green-400' },
            { label: 'Subtopics', value: topicData.subtopics.length, accent: 'text-purple-600 dark:text-purple-400' },
            { label: 'Easy', value: stats.easy, accent: 'text-green-600 dark:text-green-400' },
            { label: 'Medium', value: stats.medium, accent: 'text-amber-600 dark:text-amber-400' },
            { label: 'Hard', value: stats.hard, accent: 'text-red-600 dark:text-red-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 text-center"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-xl font-bold mt-0.5 ${s.accent}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Subtopic Sections */}
        {questions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <FileText className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              No questions yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Import GATE papers that cover {topicName} to see questions here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subtopicGroups.map(({ subtopic, questions: qs }) => {
              const isExpanded = expandedSubtopics.has(subtopic);
              return (
                <div
                  key={subtopic}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Subtopic Header */}
                  <button
                    onClick={() => toggleSubtopic(subtopic)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {subtopic}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                        {qs.length} questions
                      </span>
                      {/* Difficulty mini-badges */}
                      <div className="hidden sm:flex items-center gap-1.5 ml-2">
                        <MiniBadge
                          count={qs.filter((q) => q.difficulty === 'easy').length}
                          color="green"
                        />
                        <MiniBadge
                          count={qs.filter((q) => q.difficulty === 'medium').length}
                          color="amber"
                        />
                        <MiniBadge
                          count={qs.filter((q) => q.difficulty === 'hard').length}
                          color="red"
                        />
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Question List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                      {qs.map((q) => (
                        <Link
                          key={q.id}
                          to={`/questions/${q.id}`}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                              {q.questionNumber}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white truncate max-w-md">
                                {q.question.slice(0, 80)}
                                {q.question.length > 80 ? '...' : ''}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                GATE {q.year} &middot; Q{q.questionNumber}
                              </p>
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${styles[color]}`}>
      {count}
    </span>
  );
}
