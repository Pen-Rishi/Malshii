import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  SkipForward,
  Save,
  PartyPopper,
  AlertCircle,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { db } from '@/lib/db';
import { SUBJECT_NAMES, getAllTopics, getAllSubtopics } from '@/data/subjects';
import type { Question } from '@/types';

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Editable state for the current question
  const [edits, setEdits] = useState<Partial<Question>>({});
  const [dirty, setDirty] = useState(false);

  const reviewQueue = useLiveQuery(
    () =>
      db.questions.toArray().then((all) =>
        all.filter((q) => q.needsReview === true || q.confidence < 95)
      ),
    []
  );

  const queue = reviewQueue ?? [];
  const total = queue.length;
  const current = queue[currentIndex] ?? null;

  // Reset edits when the current question changes
  const currentId = current?.id;
  const [lastId, setLastId] = useState<number | undefined>(undefined);
  if (currentId !== lastId) {
    setLastId(currentId);
    setEdits({});
    setDirty(false);
  }

  // Merge current question with edits
  const merged = useMemo(() => {
    if (!current) return null;
    return { ...current, ...edits } as Question;
  }, [current, edits]);

  const topics = useMemo(
    () => getAllTopics(merged?.subject ?? ''),
    [merged?.subject]
  );
  const subtopics = useMemo(
    () => getAllSubtopics(merged?.subject ?? '', merged?.topic ?? ''),
    [merged?.subject, merged?.topic]
  );

  const setField = useCallback(
    <K extends keyof Question>(key: K, value: Question[K]) => {
      setEdits((prev) => {
        const next = { ...prev, [key]: value };
        // Cascade: when subject changes, reset topic/subtopic
        if (key === 'subject') {
          next.topic = '';
          next.subtopic = '';
        }
        if (key === 'topic') {
          next.subtopic = '';
        }
        return next;
      });
      setDirty(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!current?.id || !dirty) return;
    setSaving(true);
    try {
      await db.questions.update(current.id, {
        ...edits,
        updatedAt: new Date(),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [current?.id, edits, dirty]);

  const handleApprove = useCallback(async () => {
    if (!current?.id) return;
    setSaving(true);
    try {
      await db.questions.update(current.id, {
        ...edits,
        needsReview: false,
        confidence: 100,
        updatedAt: new Date(),
      });
      setReviewedCount((c) => c + 1);
      setDirty(false);
      // Stay at same index (next question will slide in) or cap at end
      if (currentIndex >= total - 1) {
        setCurrentIndex(Math.max(0, total - 2));
      }
    } finally {
      setSaving(false);
    }
  }, [current?.id, edits, currentIndex, total]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, total]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  // Loading state
  if (!reviewQueue) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500 dark:text-indigo-400/60">
          Loading review queue...
        </span>
      </div>
    );
  }

  // Empty state
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
          <PartyPopper className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          All caught up!
        </h2>
        <p className="text-sm text-slate-500 dark:text-indigo-400/60 max-w-md">
          Every question has been reviewed and approved. Import more papers or
          check back later when new questions need attention.
        </p>
      </div>
    );
  }

  const remaining = total - reviewedCount;
  const progressPercent = total > 0 ? Math.round((reviewedCount / (reviewedCount + total)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Manual Review
          </h1>
          <p className="text-sm text-slate-500 dark:text-indigo-400/60 mt-1">
            Verify and correct AI-classified questions
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 dark:text-indigo-300">
              <span className="font-semibold">{reviewedCount}</span> reviewed
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-600 dark:text-amber-300">
              <span className="font-semibold">{remaining}</span> remaining
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-indigo-400/60">
          <span>
            Question {currentIndex + 1} of {total}
          </span>
          <span>{progressPercent}% reviewed this session</span>
        </div>
        <div className="h-2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question display */}
      {merged && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Question text */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                Q{merged.questionNumber}
              </span>
              <span className="text-xs text-slate-400 dark:text-indigo-500/50">
                {merged.year} | {merged.marks} mark{merged.marks !== 1 ? 's' : ''}
              </span>
              {merged.confidence < 95 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  {merged.confidence}% confidence
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-slate-700 dark:text-indigo-100/90 whitespace-pre-wrap">
              {merged.question}
            </p>

            {merged.options.length > 0 && (
              <div className="mt-4 space-y-2">
                {merged.options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-indigo-200/70"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-semibold text-indigo-500">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="pt-0.5">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Current classification */}
            <div className="mt-6 pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-indigo-500/50 mb-2">
                Current Classification
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  merged.subject,
                  merged.topic,
                  merged.subtopic,
                  merged.concept,
                ]
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-indigo-300/60"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Edit form */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-indigo-200">
              Edit Classification
            </h3>

            {/* Subject */}
            <FieldWrapper label="Subject">
              <select
                value={merged.subject}
                onChange={(e) => setField('subject', e.target.value)}
                className={selectClass}
              >
                <option value="">Select subject</option>
                {SUBJECT_NAMES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FieldWrapper>

            {/* Topic */}
            <FieldWrapper label="Topic">
              <select
                value={merged.topic}
                onChange={(e) => setField('topic', e.target.value)}
                className={selectClass}
              >
                <option value="">Select topic</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FieldWrapper>

            {/* Subtopic */}
            <FieldWrapper label="Subtopic">
              <select
                value={merged.subtopic}
                onChange={(e) => setField('subtopic', e.target.value)}
                className={selectClass}
              >
                <option value="">Select subtopic</option>
                {subtopics.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </FieldWrapper>

            {/* Concept */}
            <FieldWrapper label="Concept">
              <input
                type="text"
                value={merged.concept}
                onChange={(e) => setField('concept', e.target.value)}
                placeholder="Enter concept"
                className={inputClass}
              />
            </FieldWrapper>

            {/* Row: Difficulty, Marks, Type */}
            <div className="grid grid-cols-3 gap-3">
              <FieldWrapper label="Difficulty">
                <select
                  value={merged.difficulty}
                  onChange={(e) =>
                    setField('difficulty', e.target.value as Question['difficulty'])
                  }
                  className={selectClass}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </FieldWrapper>

              <FieldWrapper label="Marks">
                <input
                  type="number"
                  value={merged.marks}
                  onChange={(e) => setField('marks', Number(e.target.value))}
                  min={1}
                  max={5}
                  className={inputClass}
                />
              </FieldWrapper>

              <FieldWrapper label="Type">
                <select
                  value={merged.type}
                  onChange={(e) =>
                    setField('type', e.target.value as Question['type'])
                  }
                  className={selectClass}
                >
                  <option value="MCQ">MCQ</option>
                  <option value="MSQ">MSQ</option>
                  <option value="NAT">NAT</option>
                </select>
              </FieldWrapper>
            </div>

            {/* Answer */}
            <FieldWrapper label="Answer">
              <input
                type="text"
                value={merged.answer}
                onChange={(e) => setField('answer', e.target.value)}
                placeholder="Correct answer"
                className={inputClass}
              />
            </FieldWrapper>

            {/* Explanation */}
            <FieldWrapper label="Explanation">
              <textarea
                value={merged.officialExplanation}
                onChange={(e) =>
                  setField('officialExplanation', e.target.value)
                }
                rows={3}
                placeholder="Explanation for the answer"
                className={`${inputClass} resize-y`}
              />
            </FieldWrapper>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="
                  flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                  bg-indigo-50 dark:bg-indigo-950/40
                  border border-indigo-200/60 dark:border-indigo-800/40
                  text-indigo-600 dark:text-indigo-300
                  hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>

              <button
                onClick={handleApprove}
                disabled={saving}
                className="
                  flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                  bg-emerald-500 hover:bg-emerald-600
                  text-white shadow-sm shadow-emerald-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
            bg-white dark:bg-slate-900/80
            border border-indigo-100 dark:border-indigo-900/40
            text-slate-600 dark:text-indigo-300
            hover:bg-indigo-50 dark:hover:bg-indigo-950/40
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
          "
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex >= total - 1}
          className="
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
            bg-white dark:bg-slate-900/80
            border border-indigo-100 dark:border-indigo-900/40
            text-slate-600 dark:text-indigo-300
            hover:bg-indigo-50 dark:hover:bg-indigo-950/40
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
          "
        >
          Skip / Next
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared styles & small helpers                                       */
/* ------------------------------------------------------------------ */

const selectClass = `
  w-full appearance-none px-3 py-2 rounded-lg text-sm
  bg-indigo-50/80 dark:bg-indigo-950/40
  border border-indigo-200/60 dark:border-indigo-800/40
  text-slate-700 dark:text-indigo-200
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
  transition-all duration-200
`;

const inputClass = `
  w-full px-3 py-2 rounded-lg text-sm
  bg-indigo-50/80 dark:bg-indigo-950/40
  border border-indigo-200/60 dark:border-indigo-800/40
  text-slate-700 dark:text-indigo-200
  placeholder:text-indigo-400/50 dark:placeholder:text-indigo-500/40
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
  transition-all duration-200
`;

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-indigo-500/50 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
