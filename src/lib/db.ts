import Dexie, { type EntityTable } from 'dexie';
import type {
  Paper,
  Question,
  Attempt,
  Revision,
  Bookmark,
  Note,
  AnalyticsCache,
  Settings,
} from '@/types';

class GateCSEDatabase extends Dexie {
  papers!: EntityTable<Paper, 'id'>;
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  revisions!: EntityTable<Revision, 'id'>;
  bookmarks!: EntityTable<Bookmark, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  analyticsCache!: EntityTable<AnalyticsCache, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('GateCSEMaster');

    this.version(1).stores({
      papers: '++id, year, status, importedAt',
      questions:
        '++id, paperId, year, questionNumber, subject, topic, subtopic, difficulty, marks, type, needsReview, bookmarked, solved, revisionStage, confidence, [subject+topic], [year+subject], [subject+difficulty]',
      attempts: '++id, questionId, isCorrect, attemptedAt, mode',
      revisions: '++id, questionId, stage, scheduledFor, completedAt',
      bookmarks: '++id, questionId, tag, createdAt',
      notes: '++id, questionId, subject, topic, createdAt, updatedAt',
      analyticsCache: '++id, key, computedAt',
      settings: '++id, &key',
    });
  }
}

export const db = new GateCSEDatabase();
