import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  X,
  BookOpen,
} from 'lucide-react';
import { db } from '@/lib/db';
import { SUBJECT_NAMES, getAllTopics } from '@/data/subjects';
import type { Question } from '@/types';

const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i);
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const TYPES = ['MCQ', 'MSQ', 'NAT'] as const;
const PAGE_SIZES = [10, 25, 50, 100];

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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {type}
    </span>
  );
}

function StatusIcon({ solved, needsReview }: { solved: boolean; needsReview: boolean }) {
  if (needsReview) {
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
  if (solved) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  return <Circle className="h-4 w-4 text-gray-400 dark:text-gray-600" />;
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const questions = useLiveQuery(() => db.questions.toArray()) ?? [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const [filterSubject, setFilterSubject] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterReview, setFilterReview] = useState('');

  const topics = useMemo(
    () => (filterSubject ? getAllTopics(filterSubject) : []),
    [filterSubject],
  );

  // Reset topic when subject changes
  const handleSubjectChange = (value: string) => {
    setFilterSubject(value);
    setFilterTopic('');
  };

  const filteredData = useMemo(() => {
    let data = questions;
    if (filterSubject) data = data.filter((q) => q.subject === filterSubject);
    if (filterYear) data = data.filter((q) => q.year === Number(filterYear));
    if (filterTopic) data = data.filter((q) => q.topic === filterTopic);
    if (filterDifficulty) data = data.filter((q) => q.difficulty === filterDifficulty);
    if (filterType) data = data.filter((q) => q.type === filterType);
    if (filterReview === 'review') data = data.filter((q) => q.needsReview);
    if (filterReview === 'solved') data = data.filter((q) => q.solved);
    if (filterReview === 'unsolved') data = data.filter((q) => !q.solved);
    return data;
  }, [questions, filterSubject, filterYear, filterTopic, filterDifficulty, filterType, filterReview]);

  const hasActiveFilters = filterSubject || filterYear || filterTopic || filterDifficulty || filterType || filterReview;

  const clearFilters = () => {
    setFilterSubject('');
    setFilterYear('');
    setFilterTopic('');
    setFilterDifficulty('');
    setFilterType('');
    setFilterReview('');
    setGlobalFilter('');
  };

  const columns = useMemo<ColumnDef<Question>[]>(
    () => [
      {
        accessorKey: 'year',
        header: 'Year',
        size: 80,
        cell: ({ getValue }) => (
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'questionNumber',
        header: 'Q#',
        size: 60,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        size: 200,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-900 dark:text-gray-100 truncate block max-w-[200px]" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'topic',
        header: 'Topic',
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[180px]" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'difficulty',
        header: 'Difficulty',
        size: 100,
        cell: ({ getValue }) => <DifficultyBadge difficulty={getValue<string>()} />,
      },
      {
        accessorKey: 'marks',
        header: 'Marks',
        size: 70,
        cell: ({ getValue }) => (
          <span className="font-semibold text-gray-700 dark:text-gray-300">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 80,
        cell: ({ getValue }) => <TypeBadge type={getValue<string>()} />,
      },
      {
        id: 'status',
        header: 'Status',
        size: 70,
        accessorFn: (row) => (row.solved ? 'solved' : row.needsReview ? 'review' : 'unsolved'),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusIcon solved={row.original.solved} needsReview={row.original.needsReview} />
          </div>
        ),
      },
    ],
    [],
  );

  const [columnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const q = row.original;
      return (
        q.question?.toLowerCase().includes(search) ||
        q.subject?.toLowerCase().includes(search) ||
        q.topic?.toLowerCase().includes(search) ||
        q.concept?.toLowerCase().includes(search) ||
        false
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const selectClasses =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-indigo-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Questions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse and filter all GATE CSE questions
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">
            {table.getFilteredRowModel().rows.length}
          </span>
          <span>of {questions.length} questions</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions, subjects, topics..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:bg-gray-800"
          />
        </div>

        {/* Filter row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={filterSubject} onChange={(e) => handleSubjectChange(e.target.value)} className={selectClasses}>
            <option value="">All Subjects</option>
            {SUBJECT_NAMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClasses}>
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className={selectClasses}
            disabled={!filterSubject}
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={selectClasses}>
            <option value="">All Difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClasses}>
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={filterReview} onChange={(e) => setFilterReview(e.target.value)} className={selectClasses}>
            <option value="">All Status</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
            <option value="review">Needs Review</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp className="h-3.5 w-3.5 text-indigo-500" />,
                            desc: <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-700" />
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          No questions found
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {hasActiveFilters || globalFilter
                            ? 'Try adjusting your filters or search query'
                            : 'Import a GATE paper to get started'}
                        </p>
                      </div>
                      {(hasActiveFilters || globalFilter) && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/questions/${row.original.id}`)}
                    className="cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getRowModel().rows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Rows per page</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
