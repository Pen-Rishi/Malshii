import { useState, useMemo, useCallback } from 'react';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileDown,
  Filter,
  Columns3,
  Eye,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '@/lib/db';
import { GATE_SUBJECTS, SUBJECT_NAMES } from '@/data/subjects';
import type { Question, ExportOptions } from '@/types';

const FORMAT_OPTIONS: { value: ExportOptions['format']; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'XLSX spreadsheet' },
  { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured JSON data' },
  { value: 'pdf', label: 'PDF', icon: FileDown, description: 'PDF document with table' },
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

const EXPORTABLE_FIELDS: { key: string; label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'questionNumber', label: 'Question #' },
  { key: 'subject', label: 'Subject' },
  { key: 'topic', label: 'Topic' },
  { key: 'subtopic', label: 'Subtopic' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'marks', label: 'Marks' },
  { key: 'type', label: 'Type' },
  { key: 'question', label: 'Question Text' },
  { key: 'answer', label: 'Answer' },
  { key: 'officialExplanation', label: 'Explanation' },
];

function CheckboxButton({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        checked
          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {checked ? (
        <CheckSquare className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function ExportPage() {
  const allQuestions = useLiveQuery(() => db.questions.toArray()) ?? [];

  const [format, setFormat] = useState<ExportOptions['format']>('csv');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [includeFields, setIncludeFields] = useState<string[]>(
    EXPORTABLE_FIELDS.map((f) => f.key)
  );
  const [isExporting, setIsExporting] = useState(false);

  const availableYears = useMemo(() => {
    const years = [...new Set(allQuestions.map((q) => q.year))].sort((a, b) => a - b);
    return years;
  }, [allQuestions]);

  const availableTopics = useMemo(() => {
    if (selectedSubjects.length === 0) {
      return GATE_SUBJECTS.flatMap((s) => s.topics.map((t) => t.name));
    }
    return GATE_SUBJECTS.filter((s) => selectedSubjects.includes(s.name)).flatMap((s) =>
      s.topics.map((t) => t.name)
    );
  }, [selectedSubjects]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(q.subject)) return false;
      if (selectedYears.length > 0 && !selectedYears.includes(q.year)) return false;
      if (selectedDifficulty.length > 0 && !selectedDifficulty.includes(q.difficulty)) return false;
      if (selectedTopics.length > 0 && !selectedTopics.includes(q.topic)) return false;
      return true;
    });
  }, [allQuestions, selectedSubjects, selectedYears, selectedDifficulty, selectedTopics]);

  const previewRows = useMemo(() => filteredQuestions.slice(0, 5), [filteredQuestions]);

  const toggleArrayItem = <T,>(arr: T[], item: T, setter: (v: T[]) => void) => {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const buildExportData = useCallback(
    (questions: Question[]) => {
      return questions.map((q) => {
        const row: Record<string, unknown> = {};
        for (const field of includeFields) {
          row[field] = (q as unknown as Record<string, unknown>)[field];
        }
        return row;
      });
    },
    [includeFields]
  );

  const handleExport = async () => {
    if (filteredQuestions.length === 0 || includeFields.length === 0) return;
    setIsExporting(true);

    try {
      const data = buildExportData(filteredQuestions);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `gate-cse-export-${timestamp}`;

      switch (format) {
        case 'csv': {
          const headers = includeFields.join(',');
          const rows = data.map((row) =>
            includeFields
              .map((f) => {
                const val = String(row[f] ?? '');
                return val.includes(',') || val.includes('"') || val.includes('\n')
                  ? `"${val.replace(/"/g, '""')}"`
                  : val;
              })
              .join(',')
          );
          const csv = [headers, ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          saveAs(blob, `${filename}.csv`);
          break;
        }

        case 'excel': {
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Questions');
          XLSX.writeFile(wb, `${filename}.xlsx`);
          break;
        }

        case 'json': {
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
          saveAs(blob, `${filename}.json`);
          break;
        }

        case 'pdf': {
          const doc = new jsPDF({ orientation: 'landscape' });
          doc.setFontSize(16);
          doc.text('GATE CSE Questions Export', 14, 20);
          doc.setFontSize(10);
          doc.text(`${filteredQuestions.length} questions | Exported on ${timestamp}`, 14, 28);

          const fieldLabels = includeFields.map(
            (f) => EXPORTABLE_FIELDS.find((ef) => ef.key === f)?.label ?? f
          );
          const tableData = data.map((row) =>
            includeFields.map((f) => {
              const val = String(row[f] ?? '');
              return val.length > 80 ? val.slice(0, 77) + '...' : val;
            })
          );

          autoTable(doc, {
            head: [fieldLabels],
            body: tableData,
            startY: 34,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [79, 70, 229] },
          });

          doc.save(`${filename}.pdf`);
          break;
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Export Questions</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Export your GATE CSE question bank in multiple formats with custom filters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Format & Filters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Format Selector */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-500" />
                Export Format
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = format === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormat(opt.value)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-500" />
                Filters
              </h2>

              {/* Subjects */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subjects
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSubjects(
                        selectedSubjects.length === SUBJECT_NAMES.length ? [] : [...SUBJECT_NAMES]
                      )
                    }
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {selectedSubjects.length === SUBJECT_NAMES.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_NAMES.map((name) => (
                    <CheckboxButton
                      key={name}
                      checked={selectedSubjects.includes(name)}
                      onChange={() => toggleArrayItem(selectedSubjects, name, setSelectedSubjects)}
                      label={name}
                    />
                  ))}
                </div>
              </div>

              {/* Years */}
              {availableYears.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Years
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedYears(
                          selectedYears.length === availableYears.length ? [] : [...availableYears]
                        )
                      }
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedYears.length === availableYears.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableYears.map((year) => (
                      <CheckboxButton
                        key={year}
                        checked={selectedYears.includes(year)}
                        onChange={() => toggleArrayItem(selectedYears, year, setSelectedYears)}
                        label={String(year)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <CheckboxButton
                      key={d}
                      checked={selectedDifficulty.includes(d)}
                      onChange={() => toggleArrayItem(selectedDifficulty, d, setSelectedDifficulty)}
                      label={d.charAt(0).toUpperCase() + d.slice(1)}
                    />
                  ))}
                </div>
              </div>

              {/* Topics */}
              {availableTopics.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Topics
                    </label>
                    {selectedTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTopics([])}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {availableTopics.map((topic) => (
                      <CheckboxButton
                        key={topic}
                        checked={selectedTopics.includes(topic)}
                        onChange={() => toggleArrayItem(selectedTopics, topic, setSelectedTopics)}
                        label={topic}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field Selector */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Columns3 className="w-5 h-5 text-indigo-500" />
                Include Fields
              </h2>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {includeFields.length} of {EXPORTABLE_FIELDS.length} fields selected
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setIncludeFields(
                      includeFields.length === EXPORTABLE_FIELDS.length
                        ? []
                        : EXPORTABLE_FIELDS.map((f) => f.key)
                    )
                  }
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {includeFields.length === EXPORTABLE_FIELDS.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPORTABLE_FIELDS.map((field) => (
                  <CheckboxButton
                    key={field.key}
                    checked={includeFields.includes(field.key)}
                    onChange={() => toggleArrayItem(includeFields, field.key, setIncludeFields)}
                    label={field.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Export */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-sm">
              <div className="text-sm font-medium text-indigo-100">Questions matching filters</div>
              <div className="mt-1 text-4xl font-bold">{filteredQuestions.length}</div>
              <div className="mt-2 text-sm text-indigo-200">
                out of {allQuestions.length} total questions
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || filteredQuestions.length === 0 || includeFields.length === 0}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export as {format.toUpperCase()}
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                Preview
              </h2>

              {previewRows.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="mx-auto w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No questions match the current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {includeFields.slice(0, 5).map((field) => (
                          <th
                            key={field}
                            className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                          >
                            {EXPORTABLE_FIELDS.find((f) => f.key === field)?.label ?? field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {previewRows.map((q) => (
                        <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {includeFields.slice(0, 5).map((field) => {
                            const val = String(
                              (q as unknown as Record<string, unknown>)[field] ?? ''
                            );
                            return (
                              <td
                                key={field}
                                className="py-2 px-2 text-gray-700 dark:text-gray-300 max-w-[120px] truncate"
                                title={val}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {includeFields.length > 5 && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      +{includeFields.length - 5} more columns in export
                    </p>
                  )}
                </div>
              )}

              {previewRows.length > 0 && filteredQuestions.length > 5 && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                  Showing 5 of {filteredQuestions.length} rows
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
