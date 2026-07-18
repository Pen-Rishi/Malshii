export interface Paper {
  id?: number;
  filename: string;
  year: number;
  session?: string;
  totalQuestions: number;
  totalMarks: number;
  importedAt: Date;
  rawText: string;
  status: 'imported' | 'splitting' | 'classifying' | 'done' | 'error';
  errorMessage?: string;
}

export interface Question {
  id?: number;
  paperId: number;
  year: number;
  questionNumber: number;
  paper: string;
  subject: string;
  topic: string;
  subtopic: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  type: 'MCQ' | 'MSQ' | 'NAT';
  question: string;
  options: string[];
  answer: string;
  officialExplanation: string;
  aiExplanation: string;
  images: string[];
  confidence: number;
  needsReview: boolean;
  bookmarked: boolean;
  solved: boolean;
  revisionStage: number;
  notes: string;
  relatedQuestions: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attempt {
  id?: number;
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
  attemptedAt: Date;
  mode: PracticeMode;
}

export interface Revision {
  id?: number;
  questionId: number;
  stage: number;
  scheduledFor: Date;
  completedAt?: Date;
  confidence: number;
}

export interface Bookmark {
  id?: number;
  questionId: number;
  tag: string;
  createdAt: Date;
}

export interface Note {
  id?: number;
  questionId?: number;
  subject?: string;
  topic?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsCache {
  id?: number;
  key: string;
  data: unknown;
  computedAt: Date;
}

export interface Settings {
  id?: number;
  key: string;
  value: unknown;
}

export type PracticeMode = 'subject' | 'topic' | 'year' | 'difficulty' | 'random' | 'timed' | 'exam';

export interface SubjectData {
  name: string;
  topics: TopicData[];
}

export interface TopicData {
  name: string;
  subtopics: SubtopicData[];
}

export interface SubtopicData {
  name: string;
  concepts: string[];
}

export interface ImportProgress {
  stage: 'extracting' | 'splitting' | 'classifying' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
  paperId?: number;
}

export interface AnalyticsData {
  subjectWeightage: { subject: string; count: number; percentage: number; marks: number }[];
  topicFrequency: { topic: string; subject: string; count: number }[];
  yearTrends: { year: number; subjects: Record<string, number> }[];
  marksDistribution: { marks: number; count: number }[];
  difficultyDistribution: { difficulty: string; count: number; percentage: number }[];
  weakAreas: { topic: string; subject: string; accuracy: number; attempted: number }[];
  strongAreas: { topic: string; subject: string; accuracy: number; attempted: number }[];
  coverageMatrix: { subject: string; topics: { name: string; covered: boolean; count: number }[] }[];
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'subject' | 'topic' | 'subtopic' | 'concept';
  count: number;
}

export interface ConceptEdge {
  source: string;
  target: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  filters: {
    subjects?: string[];
    years?: number[];
    difficulty?: string[];
    topics?: string[];
  };
  includeFields: string[];
}
