import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  StickyNote,
} from 'lucide-react';
import { db } from '@/lib/db';
import { explainQuestion } from '@/lib/ai';
import type { Question } from '@/types';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[difficulty] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {difficulty}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    MCQ: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    MSQ: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    NAT: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const questionId = Number(id);

  const question = useLiveQuery(
    () => (isNaN(questionId) ? undefined : db.questions.get(questionId)),
    [questionId],
  );

  // All questions sorted for prev/next navigation
  const allQuestions = useLiveQuery(
    () => db.questions.orderBy('[year+questionNumber]' as never).toArray().catch(() => db.questions.toArray()),
    [],
  );

  const sortedQuestions = useMemo(() => {
    if (!allQuestions) return [];
    return [...allQuestions].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.questionNumber - b.questionNumber;
    });
  }, [allQuestions]);

  const currentIndex = useMemo(
    () => sortedQuestions.findIndex((q) => q.id === questionId),
    [sortedQuestions, questionId],
  );

  const prevQuestion = currentIndex > 0 ? sortedQuestions[currentIndex - 1] : null;
  const nextQuestion = currentIndex < sortedQuestions.length - 1 ? sortedQuestions[currentIndex + 1] : null;

  // Related questions
  const relatedQuestions = useLiveQuery(async () => {
    if (!question?.relatedQuestions?.length) return [];
    return db.questions.where('id').anyOf(question.relatedQuestions).toArray();
  }, [question?.relatedQuestions]);

  // State
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [notesText, setNotesText] = useState<string | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);

  // Practice mode state
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [submitTime] = useState(() => Date.now());

  // Initialize notes text from question
  const currentNotes = notesText ?? question?.notes ?? '';

  const handleBookmarkToggle = useCallback(async () => {
    if (!question?.id) return;
    const newVal = !question.bookmarked;
    await db.questions.update(question.id, { bookmarked: newVal, updatedAt: new Date() });
    if (newVal) {
      await db.bookmarks.add({ questionId: question.id, tag: 'general', createdAt: new Date() });
    } else {
      await db.bookmarks.where('questionId').equals(question.id).delete();
    }
  }, [question]);

  const handleExplain = useCallback(async () => {
    if (!question) return;
    if (aiExplanation) return; // already loaded
    setIsExplaining(true);
    setExplainError('');
    try {
      const explanation = await explainQuestion(question);
      setAiExplanation(explanation);
      await db.questions.update(question.id!, { aiExplanation: explanation, updatedAt: new Date() });
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : 'Failed to generate explanation');
    } finally {
      setIsExplaining(false);
    }
  }, [question, aiExplanation]);

  const handleSaveNotes = useCallback(async () => {
    if (!question?.id) return;
    setNotesSaving(true);
    await db.questions.update(question.id, { notes: currentNotes, updatedAt: new Date() });
    setNotesSaving(false);
  }, [question, currentNotes]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!question?.id) return;

    let answer: string;
    let correct: boolean;

    if (question.type === 'MSQ') {
      answer = Array.from(selectedOptions).sort().join(',');
      const correctSet = new Set(
        question.answer
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map(Number),
      );
      correct = selectedOptions.size === correctSet.size && [...selectedOptions].every((o) => correctSet.has(o));
    } else if (question.type === 'NAT') {
      answer = userAnswer.trim();
      const expected = parseFloat(question.answer);
      const given = parseFloat(answer);
      correct = !isNaN(expected) && !isNaN(given) && Math.abs(expected - given) < 0.01;
    } else {
      answer = userAnswer;
      correct = answer === question.answer;
    }

    setIsCorrect(correct);
    setSubmitted(true);
    setShowAnswer(true);

    const timeTaken = Math.round((Date.now() - submitTime) / 1000);

    await db.attempts.add({
      questionId: question.id,
      userAnswer: answer,
      isCorrect: correct,
      timeTaken,
      attemptedAt: new Date(),
      mode: 'random',
    });

    await db.questions.update(question.id, { solved: true, updatedAt: new Date() });
  }, [question, userAnswer, selectedOptions, submitTime]);

  const handleOptionToggle = (index: number) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Reset state when question changes
  const questionKey = question?.id;
  const [lastQuestionId, setLastQuestionId] = useState<number | undefined>();
  if (questionKey !== lastQuestionId) {
    setLastQuestionId(questionKey);
    setShowAnswer(false);
    setAiExplanation(question?.aiExplanation ?? '');
    setSubmitted(false);
    setIsCorrect(null);
    setUserAnswer('');
    setSelectedOptions(new Set());
    setNotesText(null);
    setExplainError('');
  }

  // Loading state
  if (question === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (question === null || !question) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">Question not found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The question you are looking for does not exist or has been removed.
            </p>
          </div>
          <button
            onClick={() => navigate('/questions')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  const displayExplanation = aiExplanation || question.aiExplanation || '';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/questions" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
          Questions
        </Link>
        <span>/</span>
        <Link
          to={`/subjects/${encodeURIComponent(question.subject)}`}
          className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {question.subject}
        </Link>
        <span>/</span>
        <Link
          to={`/subjects/${encodeURIComponent(question.subject)}/${encodeURIComponent(question.topic)}`}
          className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {question.topic}
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900 dark:text-white">Q{question.questionNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            GATE {question.year} - Question {question.questionNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={question.type} />
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
            {question.concept && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                {question.concept}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleBookmarkToggle}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            question.bookmarked
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {question.bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {question.bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>

      {/* Question Text */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-code:text-indigo-600 dark:prose-code:text-indigo-400">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {question.question}
          </ReactMarkdown>
        </div>

        {/* Images */}
        {question.images?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {question.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Question image ${i + 1}`}
                className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ))}
          </div>
        )}
      </div>

      {/* Options / Answer Input (Practice Mode) */}
      {!question.solved && !submitted ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Your Answer
          </h3>

          {question.type === 'NAT' ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter your numerical answer..."
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const isSelected = question.type === 'MSQ'
                    ? selectedOptions.has(index)
                    : userAnswer === String(index);
                  const inputType = question.type === 'MSQ' ? 'checkbox' : 'radio';
                  return (
                    <label
                      key={index}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type={inputType}
                        name="question-option"
                        checked={isSelected}
                        onChange={() => {
                          if (question.type === 'MSQ') {
                            handleOptionToggle(index);
                          } else {
                            setUserAnswer(String(index));
                          }
                        }}
                        className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        <span className="mr-2 font-semibold text-gray-500 dark:text-gray-400">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{ p: ({ children }) => <span>{children}</span> }}
                        >
                          {option}
                        </ReactMarkdown>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={question.type === 'MSQ' ? selectedOptions.size === 0 : !userAnswer}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              </div>
            </>
          )}
        </div>
      ) : question.options?.length > 0 && (question.type === 'MCQ' || question.type === 'MSQ') ? (
        /* Show options in read-only mode when already solved */
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Options
          </h3>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <span className="mt-0.5 font-semibold text-gray-500 dark:text-gray-400">
                  {String.fromCharCode(65 + index)}.
                </span>
                <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{ p: ({ children }) => <span>{children}</span> }}
                  >
                    {option}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Submission Feedback */}
      {submitted && isCorrect !== null && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            isCorrect
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}
        >
          {isCorrect ? (
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-6 w-6 flex-shrink-0 text-red-500" />
          )}
          <div>
            <p className={`font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </p>
            {!isCorrect && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                The correct answer is: <span className="font-semibold">{question.answer}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Answer Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="flex w-full items-center justify-between p-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Answer
          </h3>
          {showAnswer ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {showAnswer && (
          <div className="border-t border-gray-200 p-6 dark:border-gray-800">
            <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {question.answer}
            </p>
            {question.officialExplanation && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Official Explanation
                </p>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {question.officialExplanation}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Explanation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            AI Explanation
          </h3>
          {!displayExplanation && !isExplaining && (
            <button
              onClick={handleExplain}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            >
              <Sparkles className="h-4 w-4" />
              Generate Explanation
            </button>
          )}
        </div>
        {isExplaining && (
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            Generating AI explanation...
          </div>
        )}
        {explainError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {explainError}
          </div>
        )}
        {displayExplanation && (
          <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {displayExplanation}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <StickyNote className="h-4 w-4" />
            Notes
          </h3>
          <button
            onClick={handleSaveNotes}
            disabled={notesSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {notesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
        <textarea
          value={currentNotes}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Add your notes here..."
          rows={4}
          className="mt-3 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
        />
      </div>

      {/* Related Questions */}
      {relatedQuestions && relatedQuestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Related Questions
          </h3>
          <div className="space-y-2">
            {relatedQuestions.map((rq) => (
              <Link
                key={rq.id}
                to={`/questions/${rq.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    GATE {rq.year}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Q{rq.questionNumber}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{rq.topic}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prev / Next Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
        {prevQuestion ? (
          <button
            onClick={() => navigate(`/questions/${prevQuestion.id}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">GATE {prevQuestion.year} Q{prevQuestion.questionNumber}</span>
            <span className="sm:hidden">Previous</span>
          </button>
        ) : (
          <div />
        )}
        {nextQuestion ? (
          <button
            onClick={() => navigate(`/questions/${nextQuestion.id}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span className="hidden sm:inline">GATE {nextQuestion.year} Q{nextQuestion.questionNumber}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
