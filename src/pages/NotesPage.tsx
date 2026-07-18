import { useState, useMemo, useCallback } from 'react';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  Plus,
  Search,
  StickyNote,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
} from 'lucide-react';
import { db } from '@/lib/db';
import { SUBJECT_NAMES, getAllTopics } from '@/data/subjects';
import type { Note } from '@/types';

interface NoteForm {
  subject: string;
  topic: string;
  content: string;
  questionId: string;
}

const EMPTY_FORM: NoteForm = { subject: '', topic: '', content: '', questionId: '' };

export default function NotesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<NoteForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NoteForm>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const allNotes = notes ?? [];

  // Topics for filter
  const filterTopics = useMemo(
    () => (subjectFilter ? getAllTopics(subjectFilter) : []),
    [subjectFilter]
  );

  // Topics for create form
  const createTopics = useMemo(
    () => (createForm.subject ? getAllTopics(createForm.subject) : []),
    [createForm.subject]
  );

  // Topics for edit form
  const editTopics = useMemo(
    () => (editForm.subject ? getAllTopics(editForm.subject) : []),
    [editForm.subject]
  );

  // Filtered notes
  const filtered = useMemo(() => {
    let result = allNotes;

    if (subjectFilter) {
      result = result.filter((n) => n.subject === subjectFilter);
    }
    if (topicFilter) {
      result = result.filter((n) => n.topic === topicFilter);
    }
    if (searchQuery.trim()) {
      const lq = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(lq) ||
          (n.subject ?? '').toLowerCase().includes(lq) ||
          (n.topic ?? '').toLowerCase().includes(lq)
      );
    }

    // Sort by most recently updated
    return result.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [allNotes, subjectFilter, topicFilter, searchQuery]);

  const handleCreate = useCallback(async () => {
    if (!createForm.content.trim()) return;
    setSaving(true);
    try {
      const now = new Date();
      await db.notes.add({
        subject: createForm.subject || undefined,
        topic: createForm.topic || undefined,
        questionId: createForm.questionId ? Number(createForm.questionId) : undefined,
        content: createForm.content.trim(),
        createdAt: now,
        updatedAt: now,
      });
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }, [createForm]);

  const startEdit = useCallback((note: Note) => {
    setEditingId(note.id ?? null);
    setEditForm({
      subject: note.subject ?? '',
      topic: note.topic ?? '',
      content: note.content,
      questionId: note.questionId?.toString() ?? '',
    });
    setExpandedId(note.id ?? null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editForm.content.trim()) return;
    setSaving(true);
    try {
      await db.notes.update(editingId, {
        subject: editForm.subject || undefined,
        topic: editForm.topic || undefined,
        questionId: editForm.questionId ? Number(editForm.questionId) : undefined,
        content: editForm.content.trim(),
        updatedAt: new Date(),
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm]);

  const handleDelete = useCallback(async (id: number) => {
    await db.notes.delete(id);
    setDeleteConfirmId(null);
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
  }, [expandedId, editingId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Loading
  if (!notes) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500 dark:text-indigo-400/60">
          Loading notes...
        </span>
      </div>
    );
  }

  // Empty state (no notes at all)
  if (allNotes.length === 0 && !showCreate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notes</h1>
            <p className="text-sm text-slate-500 dark:text-indigo-400/60 mt-1">
              Personal notes and study annotations
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
              bg-indigo-500 hover:bg-indigo-600 text-white
              shadow-sm shadow-indigo-500/20
              transition-all duration-200
            "
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            No notes yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-indigo-400/60 max-w-md">
            Start taking notes! Capture key concepts, formulas, or insights as
            you study. Notes can be linked to specific subjects, topics, or questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notes</h1>
          <p className="text-sm text-slate-500 dark:text-indigo-400/60 mt-1">
            {allNotes.length} note{allNotes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 shadow-sm
            ${
              showCreate
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'
            }
          `}
        >
          {showCreate ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              New Note
            </>
          )}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-indigo-200">
            Create New Note
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Subject (optional)</label>
              <select
                value={createForm.subject}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, subject: e.target.value, topic: '' }))
                }
                className={selectClass}
              >
                <option value="">No subject</option>
                {SUBJECT_NAMES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Topic (optional)</label>
              <select
                value={createForm.topic}
                onChange={(e) => setCreateForm((f) => ({ ...f, topic: e.target.value }))}
                className={selectClass}
                disabled={!createForm.subject}
              >
                <option value="">No topic</option>
                {createTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Question ID (optional)</label>
              <input
                type="number"
                value={createForm.questionId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, questionId: e.target.value }))
                }
                placeholder="e.g. 42"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Content</label>
            <textarea
              value={createForm.content}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={5}
              placeholder="Write your note here..."
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!createForm.content.trim() || saving}
              className="
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                bg-indigo-500 hover:bg-indigo-600 text-white
                shadow-sm shadow-indigo-500/20
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
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

        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setTopicFilter('');
          }}
          className={filterSelectClass}
        >
          <option value="">All Subjects</option>
          {SUBJECT_NAMES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {filterTopics.length > 0 && (
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className={filterSelectClass}
          >
            <option value="">All Topics</option>
            {filterTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {(subjectFilter || topicFilter || searchQuery) && (
          <button
            onClick={() => {
              setSubjectFilter('');
              setTopicFilter('');
              setSearchQuery('');
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors duration-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 && allNotes.length > 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-slate-500 dark:text-indigo-400/60">
            No notes match your filters.
          </p>
        </div>
      )}

      {/* Note cards */}
      <div className="space-y-3">
        {filtered.map((note) => {
          const isExpanded = expandedId === note.id;
          const isEditing = editingId === note.id;

          return (
            <div
              key={note.id}
              className="
                rounded-xl bg-white dark:bg-slate-900/80
                border border-indigo-100 dark:border-indigo-900/40
                shadow-sm overflow-hidden
                transition-all duration-200
              "
            >
              {/* Collapsed header (click to expand) */}
              <button
                onClick={() => {
                  if (isEditing) return;
                  setExpandedId(isExpanded ? null : note.id ?? null);
                }}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
              >
                <StickyNote className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-indigo-200 truncate">
                    {note.content.length > 100
                      ? note.content.slice(0, 100) + '...'
                      : note.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {note.subject && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400/70">
                        {note.subject}
                      </span>
                    )}
                    {note.topic && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400/70">
                        {note.topic}
                      </span>
                    )}
                    {note.questionId && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-indigo-500/50">
                        Q#{note.questionId}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-indigo-500/40 ml-auto flex-shrink-0">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-indigo-100 dark:border-indigo-900/30 p-5">
                  {isEditing ? (
                    /* Edit form */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClass}>Subject</label>
                          <select
                            value={editForm.subject}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                subject: e.target.value,
                                topic: '',
                              }))
                            }
                            className={selectClass}
                          >
                            <option value="">No subject</option>
                            {SUBJECT_NAMES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>Topic</label>
                          <select
                            value={editForm.topic}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, topic: e.target.value }))
                            }
                            className={selectClass}
                            disabled={!editForm.subject}
                          >
                            <option value="">No topic</option>
                            {editTopics.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>Question ID</label>
                          <input
                            type="number"
                            value={editForm.questionId}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                questionId: e.target.value,
                              }))
                            }
                            placeholder="e.g. 42"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Content</label>
                        <textarea
                          value={editForm.content}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, content: e.target.value }))
                          }
                          rows={6}
                          className={`${inputClass} resize-y`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editForm.content.trim() || saving}
                          className="
                            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                            bg-indigo-500 hover:bg-indigo-600 text-white
                            shadow-sm shadow-indigo-500/20
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
                          onClick={() => setEditingId(null)}
                          className="
                            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                            bg-slate-100 dark:bg-slate-800
                            text-slate-600 dark:text-slate-300
                            hover:bg-slate-200 dark:hover:bg-slate-700
                            transition-all duration-200
                          "
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only expanded content */
                    <div>
                      <p className="text-sm text-slate-700 dark:text-indigo-200/80 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>

                      {note.updatedAt &&
                        new Date(note.updatedAt).getTime() !==
                          new Date(note.createdAt).getTime() && (
                          <p className="text-[11px] text-slate-400 dark:text-indigo-500/40 mt-3">
                            Updated {formatDate(note.updatedAt)}
                          </p>
                        )}

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/30">
                        <button
                          onClick={() => startEdit(note)}
                          className="
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                            bg-indigo-50 dark:bg-indigo-950/40
                            border border-indigo-200/60 dark:border-indigo-800/40
                            text-indigo-600 dark:text-indigo-300
                            hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                            transition-all duration-200
                          "
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>

                        {deleteConfirmId === note.id ? (
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-rose-500">Delete this note?</span>
                            <button
                              onClick={() => note.id !== undefined && handleDelete(note.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                            >
                              Yes, delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(note.id ?? null)}
                            className="
                              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                              bg-rose-50 dark:bg-rose-950/30
                              border border-rose-200/60 dark:border-rose-800/40
                              text-rose-600 dark:text-rose-400
                              hover:bg-rose-100 dark:hover:bg-rose-900/40
                              transition-all duration-200
                            "
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-indigo-500/50 mb-1.5';

const selectClass = `
  w-full appearance-none px-3 py-2 rounded-lg text-sm
  bg-indigo-50/80 dark:bg-indigo-950/40
  border border-indigo-200/60 dark:border-indigo-800/40
  text-slate-700 dark:text-indigo-200
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
  disabled:opacity-50 disabled:cursor-not-allowed
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

const filterSelectClass = `
  appearance-none px-3 py-2 rounded-lg text-sm
  bg-white dark:bg-slate-900/80
  border border-indigo-200/60 dark:border-indigo-800/40
  text-slate-700 dark:text-indigo-200
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40
  cursor-pointer transition-all duration-200
`;
