import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import { db } from '@/lib/db';
import type { Question, AnalyticsData } from '@/types';

interface QuestionFilters {
  subject?: string;
  year?: number;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'MCQ' | 'MSQ' | 'NAT';
  searchQuery?: string;
  bookmarked?: boolean;
  solved?: boolean;
  needsReview?: boolean;
}

export function useQuestions(filters: QuestionFilters = {}) {
  return useLiveQuery(async () => {
    let collection = db.questions.toCollection();

    if (filters.subject) {
      collection = db.questions.where('subject').equals(filters.subject);
    }

    let results = await collection.toArray();

    if (filters.year) {
      results = results.filter((q) => q.year === filters.year);
    }
    if (filters.topic) {
      results = results.filter((q) => q.topic === filters.topic);
    }
    if (filters.difficulty) {
      results = results.filter((q) => q.difficulty === filters.difficulty);
    }
    if (filters.type) {
      results = results.filter((q) => q.type === filters.type);
    }
    if (filters.bookmarked !== undefined) {
      results = results.filter((q) => q.bookmarked === filters.bookmarked);
    }
    if (filters.solved !== undefined) {
      results = results.filter((q) => q.solved === filters.solved);
    }
    if (filters.needsReview !== undefined) {
      results = results.filter((q) => q.needsReview === filters.needsReview);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      results = results.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          q.concept.toLowerCase().includes(query)
      );
    }

    return results;
  }, [
    filters.subject,
    filters.year,
    filters.topic,
    filters.difficulty,
    filters.type,
    filters.searchQuery,
    filters.bookmarked,
    filters.solved,
    filters.needsReview,
  ]);
}

export function useQuestionsBySubject(subject: string) {
  return useLiveQuery(
    () => db.questions.where('subject').equals(subject).toArray(),
    [subject]
  );
}

export function useQuestionsByYear(year: number) {
  return useLiveQuery(
    () => db.questions.where('year').equals(year).toArray(),
    [year]
  );
}

export function useQuestionsByTopic(subject: string, topic: string) {
  return useLiveQuery(
    () =>
      db.questions
        .where('[subject+topic]')
        .equals([subject, topic])
        .toArray(),
    [subject, topic]
  );
}

export function usePapers() {
  return useLiveQuery(() => db.papers.orderBy('year').reverse().toArray());
}

export function useReviewQueue() {
  return useLiveQuery(() =>
    db.questions.where('needsReview').equals(1).toArray()
  );
}

export function useBookmarkedQuestions() {
  return useLiveQuery(() =>
    db.questions.where('bookmarked').equals(1).toArray()
  );
}

export function useAttempts(questionId: number) {
  return useLiveQuery(
    () =>
      db.attempts
        .where('questionId')
        .equals(questionId)
        .reverse()
        .sortBy('attemptedAt'),
    [questionId]
  );
}

export function useAnalytics() {
  return useLiveQuery(async (): Promise<AnalyticsData | undefined> => {
    const questions = await db.questions.toArray();
    const attempts = await db.attempts.toArray();

    if (questions.length === 0) return undefined;

    // Subject weightage
    const subjectCounts = new Map<string, { count: number; marks: number }>();
    for (const q of questions) {
      const entry = subjectCounts.get(q.subject) || { count: 0, marks: 0 };
      entry.count++;
      entry.marks += q.marks;
      subjectCounts.set(q.subject, entry);
    }
    const subjectWeightage = Array.from(subjectCounts.entries()).map(
      ([subject, { count, marks }]) => ({
        subject,
        count,
        percentage: Math.round((count / questions.length) * 100),
        marks,
      })
    );

    // Topic frequency
    const topicCounts = new Map<string, { subject: string; count: number }>();
    for (const q of questions) {
      const key = `${q.subject}::${q.topic}`;
      const entry = topicCounts.get(key) || { subject: q.subject, count: 0 };
      entry.count++;
      topicCounts.set(key, entry);
    }
    const topicFrequency = Array.from(topicCounts.entries())
      .map(([key, { subject, count }]) => ({
        topic: key.split('::')[1],
        subject,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Year trends
    const yearMap = new Map<number, Record<string, number>>();
    for (const q of questions) {
      if (!yearMap.has(q.year)) yearMap.set(q.year, {});
      const subjects = yearMap.get(q.year)!;
      subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    }
    const yearTrends = Array.from(yearMap.entries())
      .map(([year, subjects]) => ({ year, subjects }))
      .sort((a, b) => a.year - b.year);

    // Marks distribution
    const marksCounts = new Map<number, number>();
    for (const q of questions) {
      marksCounts.set(q.marks, (marksCounts.get(q.marks) || 0) + 1);
    }
    const marksDistribution = Array.from(marksCounts.entries())
      .map(([marks, count]) => ({ marks, count }))
      .sort((a, b) => a.marks - b.marks);

    // Difficulty distribution
    const diffCounts = new Map<string, number>();
    for (const q of questions) {
      diffCounts.set(q.difficulty, (diffCounts.get(q.difficulty) || 0) + 1);
    }
    const difficultyDistribution = Array.from(diffCounts.entries()).map(
      ([difficulty, count]) => ({
        difficulty,
        count,
        percentage: Math.round((count / questions.length) * 100),
      })
    );

    // Weak and strong areas based on attempts
    const topicAccuracy = new Map<
      string,
      { subject: string; correct: number; total: number }
    >();
    const questionMap = new Map<number, Question>();
    for (const q of questions) {
      if (q.id !== undefined) questionMap.set(q.id, q);
    }

    for (const a of attempts) {
      const q = questionMap.get(a.questionId);
      if (!q) continue;
      const key = `${q.subject}::${q.topic}`;
      const entry = topicAccuracy.get(key) || {
        subject: q.subject,
        correct: 0,
        total: 0,
      };
      entry.total++;
      if (a.isCorrect) entry.correct++;
      topicAccuracy.set(key, entry);
    }

    const areaStats = Array.from(topicAccuracy.entries()).map(
      ([key, { subject, correct, total }]) => ({
        topic: key.split('::')[1],
        subject,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        attempted: total,
      })
    );

    const weakAreas = areaStats
      .filter((a) => a.attempted >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    const strongAreas = areaStats
      .filter((a) => a.attempted >= 2)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 10);

    // Coverage matrix
    const { GATE_SUBJECTS } = await import('@/data/subjects');
    const coverageMatrix = GATE_SUBJECTS.map((subj) => ({
      subject: subj.name,
      topics: subj.topics.map((t) => {
        const count = questions.filter(
          (q) => q.subject === subj.name && q.topic === t.name
        ).length;
        return { name: t.name, covered: count > 0, count };
      }),
    }));

    return {
      subjectWeightage,
      topicFrequency,
      yearTrends,
      marksDistribution,
      difficultyDistribution,
      weakAreas,
      strongAreas,
      coverageMatrix,
    };
  });
}
