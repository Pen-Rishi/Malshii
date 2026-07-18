import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BookOpen,
  Layers,
  Calendar,
  Signal,
  Shuffle,
  Timer,
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  Flag,
  SkipForward,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { db } from '@/lib/db';
import { GATE_SUBJECTS, SUBJECT_NAMES, getAllTopics } from '@/data/subjects';
import type { Question, PracticeMode, Attempt } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────

interface ModeConfig {
  mode: PracticeMode;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

interface SessionConfig {
  mode: PracticeMode;
  subject?: string;
  topic?: string;
  year?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount: number;
  timeLimit?: number; // seconds
}

interface SessionResult {
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  timeTaken: number;
  totalMarks: number;
  scoredMarks: number;
  questions: {
    question: Question;
    userAnswer: string | null;
    isCorrect: boolean | null;
    flagged: boolean;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const MODE_CONFIGS: ModeConfig[] = [
  {
    mode: 'subject',
    label: 'Subject',
    description: 'Practice questions from a specific subject',
    icon: BookOpen,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    mode: 'topic',
    label: 'Topic',
    description: 'Focus on a specific topic within a subject',
    icon: Layers,
    color: 'from-purple-500 to-purple-600',
  },
  {
    mode: 'year',
    label: 'Year',
    description: 'Solve questions from a specific GATE year',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
  },
  {
    mode: 'difficulty',
    label: 'Difficulty',
    description: 'Practice by difficulty level',
    icon: Signal,
    color: 'from-amber-500 to-amber-600',
  },
  {
    mode: 'random',
    label: 'Random',
    description: 'Random mix of questions across all subjects',
    icon: Shuffle,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    mode: 'timed',
    label: 'Timed',
    description: 'Practice with a countdown timer',
    icon: Timer,
    color: 'from-rose-500 to-rose-600',
  },
  {
    mode: 'exam',
    label: 'Exam',
    description: 'Simulates a full 3-hour GATE exam (65 questions)',
    icon: GraduationCap,
    color: 'from-violet-500 to-violet-600',
  },
];

const EXAM_DURATION = 3 * 60 * 60; // 3 hours in seconds
const EXAM_QUESTION_COUNT = 65;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function PracticePage() {
  const [phase, setPhase] = useState<'select' | 'configure' | 'practice' | 'results'>('select');
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);

  // Filter state
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [year, setYear] = useState<number>(2024);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState(30); // minutes

  // Available years
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Practice state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [natInput, setNatInput] = useState('');

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Results
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const topics = useMemo(() => {
    if (!subject) return [];
    return getAllTopics(subject);
  }, [subject]);

  // Load available years from db
  useEffect(() => {
    db.questions
      .orderBy('year')
      .uniqueKeys()
      .then((keys) => {
        setAvailableYears(keys as number[]);
      });
  }, []);

  // Timer effect
  useEffect(() => {
    if (phase !== 'practice') return;
    const isTimed = selectedMode === 'timed' || selectedMode === 'exam';

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);

      if (isTimed) {
        const remaining = timeRemaining - 1;
        if (remaining <= 0) {
          finishSession();
          return;
        }
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, selectedMode, timeRemaining]);

  // ─── Mode Selection ──────────────────────────────────────────────────

  function handleModeSelect(mode: PracticeMode) {
    setSelectedMode(mode);
    if (mode === 'random') {
      setPhase('configure');
    } else if (mode === 'exam') {
      setPhase('configure');
    } else {
      setPhase('configure');
    }
  }

  // ─── Load Questions ──────────────────────────────────────────────────

  async function startPractice() {
    let allQuestions: Question[] = [];

    if (selectedMode === 'subject' && subject) {
      allQuestions = await db.questions.where('subject').equals(subject).toArray();
    } else if (selectedMode === 'topic' && subject && topic) {
      allQuestions = await db.questions
        .where('[subject+topic]')
        .equals([subject, topic])
        .toArray();
    } else if (selectedMode === 'year') {
      allQuestions = await db.questions.where('year').equals(year).toArray();
    } else if (selectedMode === 'difficulty') {
      allQuestions = await db.questions.where('difficulty').equals(difficulty).toArray();
    } else if (selectedMode === 'random') {
      allQuestions = await db.questions.toArray();
    } else if (selectedMode === 'timed') {
      allQuestions = await db.questions.toArray();
      if (subject) {
        allQuestions = allQuestions.filter((q) => q.subject === subject);
      }
    } else if (selectedMode === 'exam') {
      allQuestions = await db.questions.toArray();
    }

    if (allQuestions.length === 0) return;

    const count =
      selectedMode === 'exam'
        ? Math.min(EXAM_QUESTION_COUNT, allQuestions.length)
        : Math.min(questionCount, allQuestions.length);

    const selected = shuffleArray(allQuestions).slice(0, count);
    setQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers(new Map());
    setFlagged(new Set());
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setNatInput('');
    setSessionResult(null);

    // Set timer
    if (selectedMode === 'exam') {
      setTimeRemaining(EXAM_DURATION);
    } else if (selectedMode === 'timed') {
      setTimeRemaining(timeLimit * 60);
    }

    startTimeRef.current = Date.now();
    setElapsedTime(0);
    setPhase('practice');
  }

  // ─── Answer Handling ──────────────────────────────────────────────────

  function handleSelectOption(option: string) {
    if (showFeedback) return;
    const q = questions[currentIndex];
    if (!q || !q.id) return;

    setUserAnswers((prev) => new Map(prev).set(q.id!, option));
  }

  function handleNATSubmit() {
    if (showFeedback || !natInput.trim()) return;
    const q = questions[currentIndex];
    if (!q || !q.id) return;

    setUserAnswers((prev) => new Map(prev).set(q.id!, natInput.trim()));
  }

  async function submitAnswer() {
    const q = questions[currentIndex];
    if (!q || !q.id) return;

    const userAnswer = userAnswers.get(q.id);
    if (!userAnswer) return;

    let isCorrect = false;
    if (q.type === 'NAT') {
      const userNum = parseFloat(userAnswer);
      const answerNum = parseFloat(q.answer);
      isCorrect = !isNaN(userNum) && !isNaN(answerNum) && Math.abs(userNum - answerNum) < 0.01;
    } else {
      isCorrect = userAnswer === q.answer;
    }

    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);

    // Record attempt
    const attempt: Omit<Attempt, 'id'> = {
      questionId: q.id,
      userAnswer,
      isCorrect,
      timeTaken: elapsedTime,
      attemptedAt: new Date(),
      mode: selectedMode!,
    };
    await db.attempts.add(attempt as Attempt);

    // Mark question as solved
    await db.questions.update(q.id, { solved: true });
  }

  function nextQuestion() {
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setNatInput('');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishSession();
    }
  }

  function skipQuestion() {
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setNatInput('');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishSession();
    }
  }

  function toggleFlag() {
    const q = questions[currentIndex];
    if (!q || !q.id) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(q.id!)) next.delete(q.id!);
      else next.add(q.id!);
      return next;
    });
  }

  // ─── Finish Session ──────────────────────────────────────────────────

  const finishSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let totalMarks = 0;
    let scoredMarks = 0;
    const isExam = selectedMode === 'exam';

    const questionResults = questions.map((q) => {
      const userAnswer = q.id ? userAnswers.get(q.id) ?? null : null;
      let isCorrect: boolean | null = null;
      totalMarks += q.marks;

      if (userAnswer) {
        if (q.type === 'NAT') {
          const userNum = parseFloat(userAnswer);
          const answerNum = parseFloat(q.answer);
          isCorrect = !isNaN(userNum) && !isNaN(answerNum) && Math.abs(userNum - answerNum) < 0.01;
        } else {
          isCorrect = userAnswer === q.answer;
        }

        if (isCorrect) {
          correct++;
          scoredMarks += q.marks;
        } else {
          incorrect++;
          // GATE negative marking: -1/3 for wrong MCQ
          if (isExam && q.type === 'MCQ') {
            scoredMarks -= q.marks / 3;
          }
        }
      } else {
        skipped++;
      }

      return {
        question: q,
        userAnswer,
        isCorrect,
        flagged: q.id ? flagged.has(q.id) : false,
      };
    });

    const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;

    setSessionResult({
      total: questions.length,
      correct,
      incorrect,
      skipped,
      accuracy,
      timeTaken: totalTime,
      totalMarks,
      scoredMarks: Math.round(scoredMarks * 100) / 100,
      questions: questionResults,
    });
    setPhase('results');
  }, [questions, userAnswers, flagged, selectedMode]);

  function resetSession() {
    setPhase('select');
    setSelectedMode(null);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers(new Map());
    setFlagged(new Set());
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setNatInput('');
    setSessionResult(null);
  }

  // ─── Render: Mode Selection ───────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Choose a practice mode to start solving questions
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {MODE_CONFIGS.map((config) => {
              const Icon = config.icon;
              return (
                <button
                  key={config.mode}
                  onClick={() => handleModeSelect(config.mode)}
                  className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 hover:-translate-y-0.5 text-left"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    {config.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {config.description}
                  </p>
                  <ChevronRight className="absolute top-6 right-5 w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Configuration ────────────────────────────────────────────

  if (phase === 'configure') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setPhase('select')}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to modes
          </button>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Configure{' '}
              {MODE_CONFIGS.find((m) => m.mode === selectedMode)?.label} Practice
            </h2>

            <div className="space-y-5">
              {/* Subject dropdown for subject, topic, timed modes */}
              {(selectedMode === 'subject' || selectedMode === 'topic' || selectedMode === 'timed') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setTopic('');
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    <option value="">Select a subject</option>
                    {SUBJECT_NAMES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Topic dropdown for topic mode */}
              {selectedMode === 'topic' && subject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    <option value="">Select a topic</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year dropdown */}
              {selectedMode === 'year' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    {availableYears.length > 0 ? (
                      availableYears.map((y) => (
                        <option key={y} value={y}>
                          GATE {y}
                        </option>
                      ))
                    ) : (
                      Array.from({ length: 25 }, (_, i) => 2024 - i).map((y) => (
                        <option key={y} value={y}>
                          GATE {y}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Difficulty dropdown */}
              {selectedMode === 'difficulty' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              )}

              {/* Question count (not for exam) */}
              {selectedMode !== 'exam' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Math.min(200, Number(e.target.value))))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
              )}

              {/* Time limit for timed mode */}
              {selectedMode === 'timed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(5, Math.min(180, Number(e.target.value))))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
              )}

              {/* Exam mode info */}
              {selectedMode === 'exam' && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-violet-700 dark:text-violet-300">
                      <p className="font-medium mb-1">GATE Exam Simulation</p>
                      <ul className="space-y-0.5 text-violet-600 dark:text-violet-400">
                        <li>65 questions, 3 hours, 100 marks total</li>
                        <li>+marks for correct answers</li>
                        <li>-1/3 marks for wrong MCQ answers</li>
                        <li>No negative marking for NAT questions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Start button */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={startPractice}
                disabled={
                  (selectedMode === 'subject' && !subject) ||
                  (selectedMode === 'topic' && (!subject || !topic))
                }
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Practice
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Practice ─────────────────────────────────────────────────

  if (phase === 'practice' && questions.length > 0) {
    const q = questions[currentIndex];
    const hasAnswer = q.id ? userAnswers.has(q.id) : false;
    const selectedOption = q.id ? userAnswers.get(q.id) : undefined;
    const isTimed = selectedMode === 'timed' || selectedMode === 'exam';
    const isFlagged = q.id ? flagged.has(q.id) : false;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Bar: Progress + Timer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={finishSession}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                End Session
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span
                  className={`text-sm font-mono font-medium ${
                    isTimed && timeRemaining < 300
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isTimed ? formatTime(timeRemaining) : formatTime(elapsedTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Question Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                  {q.subject}
                </span>
                <span>{q.topic}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="capitalize">{q.difficulty}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{q.type}</span>
              </div>
              <button
                onClick={toggleFlag}
                className={`p-1.5 rounded-md transition-colors ${
                  isFlagged
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950'
                    : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950'
                }`}
                title="Flag for review"
              >
                <Flag className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Question Body */}
            <div className="p-6">
              <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                {q.question}
              </p>

              {/* Options for MCQ/MSQ */}
              {(q.type === 'MCQ' || q.type === 'MSQ') && q.options.length > 0 && (
                <div className="mt-5 space-y-2.5">
                  {q.options.map((option, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === q.answer;
                    let optionClass =
                      'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30';

                    if (showFeedback) {
                      if (isCorrectOption) {
                        optionClass =
                          'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30';
                      } else if (isSelected && !lastAnswerCorrect) {
                        optionClass =
                          'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30';
                      }
                    } else if (isSelected) {
                      optionClass =
                        'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(option)}
                        disabled={showFeedback}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${optionClass}`}
                      >
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm text-gray-800 dark:text-gray-200 pt-0.5">
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* NAT Input */}
              {q.type === 'NAT' && (
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Enter your numerical answer
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={natInput}
                      onChange={(e) => setNatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleNATSubmit();
                        }
                      }}
                      disabled={showFeedback}
                      placeholder="Type your answer..."
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors disabled:opacity-60"
                    />
                    {!showFeedback && !hasAnswer && (
                      <button
                        onClick={handleNATSubmit}
                        disabled={!natInput.trim()}
                        className="px-4 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Set
                      </button>
                    )}
                  </div>
                  {showFeedback && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Correct answer: <span className="font-medium text-emerald-600 dark:text-emerald-400">{q.answer}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Feedback */}
              {showFeedback && (
                <div
                  className={`mt-5 p-4 rounded-lg border ${
                    lastAnswerCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {lastAnswerCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        lastAnswerCorrect
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}
                    >
                      {lastAnswerCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {q.officialExplanation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {q.officialExplanation}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <button
                onClick={skipQuestion}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>

              <div className="flex items-center gap-3">
                {!showFeedback ? (
                  <button
                    onClick={submitAnswer}
                    disabled={!hasAnswer}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator (mini dots) */}
          <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
            {questions.map((qItem, i) => {
              const answered = qItem.id ? userAnswers.has(qItem.id) : false;
              const qFlagged = qItem.id ? flagged.has(qItem.id) : false;
              const isCurrent = i === currentIndex;

              let dotClass = 'bg-gray-200 dark:bg-gray-700';
              if (isCurrent) dotClass = 'bg-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-700';
              else if (answered) dotClass = 'bg-emerald-400 dark:bg-emerald-600';

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!showFeedback) {
                      setCurrentIndex(i);
                      setNatInput('');
                    }
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${dotClass} ${
                    qFlagged ? 'ring-2 ring-amber-400' : ''
                  }`}
                  title={`Question ${i + 1}${qFlagged ? ' (flagged)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Results ──────────────────────────────────────────────────

  if (phase === 'results' && sessionResult) {
    const r = sessionResult;
    const isExam = selectedMode === 'exam';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Complete</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {MODE_CONFIGS.find((m) => m.mode === selectedMode)?.label} Practice
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{r.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{r.correct}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Correct</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">{r.incorrect}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Incorrect</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">{r.skipped}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Skipped</div>
            </div>
          </div>

          {/* Accuracy + Score + Time */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Accuracy */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-gray-200 dark:text-gray-800"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={`${(r.accuracy / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      className={
                        r.accuracy >= 70
                          ? 'text-emerald-500'
                          : r.accuracy >= 40
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                    {r.accuracy}%
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Accuracy</div>
              </div>

              {/* Score (exam) or Marks */}
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isExam ? r.scoredMarks : r.scoredMarks}
                  <span className="text-lg text-gray-400 dark:text-gray-500 font-normal">
                    /{r.totalMarks}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isExam ? 'Score' : 'Marks'}
                </div>
                {isExam && r.incorrect > 0 && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                    Includes negative marking
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatTime(r.timeTaken)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time Taken</div>
              </div>
            </div>
          </div>

          {/* Question Review List */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Question Review
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
              {r.questions.map((qr, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  {qr.isCorrect === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {qr.isCorrect === false && (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  {qr.isCorrect === null && (
                    <SkipForward className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    {qr.question.question.slice(0, 80)}
                    {qr.question.question.length > 80 ? '...' : ''}
                  </span>
                  {qr.flagged && <Flag className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" />}
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {qr.question.marks}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetSession}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Practice Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading questions...</p>
      </div>
    </div>
  );
}
