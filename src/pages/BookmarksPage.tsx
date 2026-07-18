import { useState, useMemo, useCallback } from 'react';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookmarkX,
  Eye,
  Search,
  Tag,
  Plus,
  X,
  Check,
  Loader2,
  BookmarkPlus,
} from 'lucide-react';
import { db } from '@/lib/db';
import { SUBJECT_NAMES } from '@/data/subjects';
import type { Question, Bookmark as BookmarkType } from '@/types';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export default function BookmarksPage() {
  const navigate = useNavigate();

  const [subjectFilter, setSubjectFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [addingTagForQuestion, setAddingTagForQuestion] = useState<number | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  const bookmarkedQuestions = useLiveQuery(
    () =>
      db.questions.toArray().then((all) => all.filter((q) => q.bookmarked === true)),
    []
  );

  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);

  const questions = bookmarkedQuestions ?? [];
  const allBookmarks = bookmarks ?? [];

  // Build a map: questionId -> bookmark entries
  const bookmarkMap = useMemo(() => {
    const map = new Map<number, BookmarkType[]>();
    for (const bm of allBookmarks) {
      const existing = map.get(bm.questionId) ?? [];
      existing.push(bm);
      map.set(bm.questionId, existing);
    }
    return map;
  }, [allBookmarks]);

  // Unique tags across all bookmarks
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const bm of allBookmarks) {
      if (bm.tag) tags.add(bm.tag);
    }
    return Array.from(tags).sort();
  }, [allBookmarks]);

  // Filtered questions
  const filtered = useMemo(() => {
    let result = questions;

    if (subjectFilter) {
      result = result.filter((q) => q.subject === subjectFilter);
    }

    if (tagFilter) {
      const questionIdsWithTag = new Set(
        allBookmarks.filter((bm) => bm.tag === tagFilter).map((bm) => bm.questionId)
      );
      result = result.filter((q) => q.id !== undefined && questionIdsWithTag.has(q.id));
    }

    if (searchQuery.trim()) {
      const lq = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.question.toLowerCase().includes(lq) ||
          q.topic.toLowerCase().includes(lq) ||
          q.subject.toLowerCase().includes(lq) ||
          q.concept.toLowerCase().includes(lq)
      );
    }

    return result;
  }, [questions, subjectFilter, tagFilter, searchQuery, allBookmarks]);

  const handleRemoveBookmark = useCallback(async (question: Question) => {
    if (!question.id) return;
    await db.questions.update(question.id, { bookmarked: false, updatedAt: new Date() });
    await db.bookmarks.where('questionId').equals(question.id).delete();
  }, []);

  const handleSaveTag = useCallback(
    async (bookmarkId: number) => {
      await db.bookmarks.update(bookmarkId, { tag: tagInput });
      setEditingTagId(null);
      setTagInput('');
    },
    [tagInput]
  );

  const handleAddTag = useCallback(
    async (questionId: number) => {
      if (!newTagInput.trim()) return;
      await db.bookmarks.add({
        questionId,
        tag: newTagInput.trim(),
        createdAt: new Date(),
      });
      setAddingTagForQuestion(null);
      setNewTagInput('');
    },
    [newTagInput]
  );

  // Loading
  if (!bookmarkedQuestions || !bookmarks) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500 dark:text-indigo-400/60">
          Loading bookmarks...
        </span>
      </div>
    );
  }

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
          <BookmarkPlus className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          No bookmarks yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-indigo-400/60 max-w-md">
          Bookmark important questions while browsing or practicing to build your
          personal revision list. Look for the bookmark icon on any question.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Bookmarks
        </h1>
        <p className="text-sm text-slate-500 dark:text-indigo-400/60 mt-1">
          {questions.length} bookmarked question{questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-9 pr-8 py-2 rounded-lg text-sm
              bg-white dark:bg-slate-900/80
              border border-indigo-200/60 dark:border-indigo-800/40
              text-slate-700 dark:text-indigo-200
              placeholder:text-indigo-400/50 dark:placeholder:text-indigo-500/40
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              transition-all duration-200
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subject filter */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="
            appearance-none px-3 py-2 rounded-lg text-sm
            bg-white dark:bg-slate-900/80
            border border-indigo-200/60 dark:border-indigo-800/40
            text-slate-700 dark:text-indigo-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            cursor-pointer transition-all duration-200
          "
        >
          <option value="">All Subjects</option>
          {SUBJECT_NAMES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="
              appearance-none px-3 py-2 rounded-lg text-sm
              bg-white dark:bg-slate-900/80
              border border-indigo-200/60 dark:border-indigo-800/40
              text-slate-700 dark:text-indigo-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              cursor-pointer transition-all duration-200
            "
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {/* Active filter reset */}
        {(subjectFilter || tagFilter || searchQuery) && (
          <button
            onClick={() => {
              setSubjectFilter('');
              setTagFilter('');
              setSearchQuery('');
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium
              bg-indigo-100 dark:bg-indigo-900/50
              text-indigo-600 dark:text-indigo-300
              hover:bg-indigo-200 dark:hover:bg-indigo-800/50
              transition-colors duration-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      {filtered.length !== questions.length && (
        <p className="text-xs text-slate-400 dark:text-indigo-500/50">
          Showing {filtered.length} of {questions.length} bookmarks
        </p>
      )}

      {/* No results after filtering */}
      {filtered.length === 0 && questions.length > 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-slate-500 dark:text-indigo-400/60">
            No bookmarks match your filters.
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((q) => {
          const qBookmarks = q.id !== undefined ? bookmarkMap.get(q.id) ?? [] : [];

          return (
            <div
              key={q.id}
              className="
                rounded-xl bg-white dark:bg-slate-900/80
                border border-indigo-100 dark:border-indigo-900/40
                p-5 shadow-sm
                hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/60
                transition-all duration-200
              "
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                    {q.year}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-indigo-500/50">
                    Q{q.questionNumber}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${DIFFICULTY_COLORS[q.difficulty]}`}
                  >
                    {q.difficulty}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    {q.marks} mark{q.marks !== 1 ? 's' : ''}
                  </span>
                </div>
                <Bookmark className="w-4 h-4 text-indigo-400 fill-indigo-400 flex-shrink-0" />
              </div>

              {/* Subject / Topic */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-indigo-300/60">
                  {q.subject}
                </span>
                {q.topic && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-indigo-300/60">
                    {q.topic}
                  </span>
                )}
              </div>

              {/* Question preview */}
              <p className="text-sm text-slate-600 dark:text-indigo-200/70 line-clamp-2 mb-4">
                {q.question}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {qBookmarks.map((bm) =>
                  editingTagId === bm.id ? (
                    <div key={bm.id} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTag(bm.id!);
                          if (e.key === 'Escape') setEditingTagId(null);
                        }}
                        autoFocus
                        className="w-24 px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 text-slate-700 dark:text-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                      />
                      <button
                        onClick={() => handleSaveTag(bm.id!)}
                        className="p-0.5 rounded text-emerald-500 hover:text-emerald-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingTagId(null)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : bm.tag ? (
                    <button
                      key={bm.id}
                      onClick={() => {
                        setEditingTagId(bm.id!);
                        setTagInput(bm.tag);
                      }}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {bm.tag}
                    </button>
                  ) : null
                )}

                {/* Add tag button */}
                {addingTagForQuestion === q.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && q.id !== undefined) handleAddTag(q.id);
                        if (e.key === 'Escape') setAddingTagForQuestion(null);
                      }}
                      autoFocus
                      placeholder="Tag name"
                      className="w-24 px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 text-slate-700 dark:text-indigo-200 placeholder:text-indigo-400/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                    />
                    <button
                      onClick={() => q.id !== undefined && handleAddTag(q.id)}
                      className="p-0.5 rounded text-emerald-500 hover:text-emerald-600"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setAddingTagForQuestion(null)}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTagForQuestion(q.id ?? null);
                      setNewTagInput('');
                    }}
                    className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-md border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-400 dark:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Tag
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-indigo-100 dark:border-indigo-900/30">
                <button
                  onClick={() => navigate(`/questions/${q.id}`)}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-indigo-50 dark:bg-indigo-950/40
                    border border-indigo-200/60 dark:border-indigo-800/40
                    text-indigo-600 dark:text-indigo-300
                    hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                    transition-all duration-200
                  "
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                <button
                  onClick={() => handleRemoveBookmark(q)}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-rose-50 dark:bg-rose-950/30
                    border border-rose-200/60 dark:border-rose-800/40
                    text-rose-600 dark:text-rose-400
                    hover:bg-rose-100 dark:hover:bg-rose-900/40
                    transition-all duration-200
                  "
                >
                  <BookmarkX className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
