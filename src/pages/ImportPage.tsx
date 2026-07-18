import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Upload,
  FileText,
  Archive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Clock,
  Sparkles,
  ArrowRight,
  FileUp,
  Layers,
} from 'lucide-react';
import { db } from '@/lib/db';
import { parsePDF, splitIntoQuestions, parseZip, detectYear } from '@/lib/pdfParser';
import { classifyQuestion } from '@/lib/ai';
import { useAppStore } from '@/store/appStore';
import type { Paper, ImportProgress } from '@/types';

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  imported: {
    icon: <FileUp className="h-3.5 w-3.5" />,
    label: 'Imported',
    cls: 'bg-blue-500/10 text-blue-400',
  },
  splitting: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: 'Splitting',
    cls: 'bg-amber-500/10 text-amber-400',
  },
  classifying: {
    icon: <Sparkles className="h-3.5 w-3.5 animate-pulse" />,
    label: 'Classifying',
    cls: 'bg-purple-500/10 text-purple-400',
  },
  done: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Done',
    cls: 'bg-emerald-500/10 text-emerald-400',
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Error',
    cls: 'bg-red-500/10 text-red-400',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.imported;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar component                                             */
/* ------------------------------------------------------------------ */

function ProgressBar({ progress }: { progress: ImportProgress }) {
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const stageLabels: Record<string, string> = {
    extracting: 'Extracting text from PDF...',
    splitting: 'Splitting into questions...',
    classifying: 'Classifying with AI...',
    done: 'Import complete!',
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {stageLabels[progress.stage] || progress.stage}
        </p>
        <span className="text-sm font-semibold text-indigo-400">{pct}%</span>
      </div>

      {/* Track */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {progress.message && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{progress.message}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Import page                                                        */
/* ------------------------------------------------------------------ */

export default function ImportPage() {
  const { importProgress, setImportProgress } = useAppStore();
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  /* ---------- previously imported papers ---------- */
  const papers = useLiveQuery(() => db.papers.orderBy('importedAt').reverse().toArray()) as
    | Paper[]
    | undefined;

  /* ---------- core import pipeline ---------- */

  const processPDF = useCallback(
    async (file: File) => {
      const filename = file.name;
      const year = detectYear(filename) || new Date().getFullYear();

      // Stage 1: extract text
      setImportProgress({ stage: 'extracting', current: 0, total: 1, message: `Extracting ${filename}...` });
      let rawText: string;
      try {
        rawText = await parsePDF(file);
      } catch (err: any) {
        throw new Error(`Failed to parse ${filename}: ${err.message}`);
      }

      // Save paper record
      const paperId = (await db.papers.add({
        filename,
        year,
        totalQuestions: 0,
        totalMarks: 0,
        importedAt: new Date(),
        rawText,
        status: 'splitting',
      })) as number;

      // Stage 2: split into questions
      setImportProgress({ stage: 'splitting', current: 0, total: 1, message: `Splitting ${filename} into questions...`, paperId });
      let parsed;
      try {
        parsed = splitIntoQuestions(rawText, year);
      } catch (err: any) {
        await db.papers.update(paperId, { status: 'error', errorMessage: err.message });
        throw new Error(`Failed to split ${filename}: ${err.message}`);
      }

      if (!parsed.length) {
        await db.papers.update(paperId, { status: 'error', errorMessage: 'No questions found' });
        throw new Error(`No questions found in ${filename}`);
      }

      await db.papers.update(paperId, { status: 'classifying', totalQuestions: parsed.length });

      // Stage 3: classify each question
      let totalMarks = 0;
      for (let i = 0; i < parsed.length; i++) {
        const q = parsed[i];
        setImportProgress({
          stage: 'classifying',
          current: i + 1,
          total: parsed.length,
          message: `Classifying question ${i + 1} of ${parsed.length}...`,
          paperId,
        });

        let classification: any = {};
        try {
          classification = await classifyQuestion(q.text, q.options || []);
        } catch {
          // If AI fails, store with needsReview flag
          classification = { subject: '', topic: '', subtopic: '', concept: '', difficulty: 'medium' };
        }

        const marks = q.marks || (q.type === 'NAT' ? 2 : q.type === 'MSQ' ? 2 : 1);
        totalMarks += marks;

        await db.questions.add({
          paperId,
          year,
          questionNumber: q.questionNumber ?? i + 1,
          paper: filename,
          subject: classification.subject || '',
          topic: classification.topic || '',
          subtopic: classification.subtopic || '',
          concept: classification.concept || '',
          difficulty: classification.difficulty || 'medium',
          marks,
          type: q.type || 'MCQ',
          question: q.text,
          options: q.options || [],
          answer: '',
          officialExplanation: '',
          aiExplanation: '',
          images: [],
          confidence: classification.confidence ?? 0,
          needsReview: !classification.subject,
          bookmarked: false,
          solved: false,
          revisionStage: 0,
          notes: '',
          relatedQuestions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.papers.update(paperId, { status: 'done', totalMarks });
    },
    [setImportProgress],
  );

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (importing) return;
      setImporting(true);
      setErrors([]);

      const allPDFs: File[] = [];

      // Collect PDFs (extract from ZIPs first)
      for (const file of acceptedFiles) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          try {
            setImportProgress({
              stage: 'extracting',
              current: 0,
              total: 1,
              message: `Extracting ${file.name}...`,
            });
            const pdfs = await parseZip(file);
            allPDFs.push(...pdfs);
          } catch (err: any) {
            setErrors((prev) => [...prev, `Failed to extract ${file.name}: ${err.message}`]);
          }
        } else {
          allPDFs.push(file);
        }
      }

      // Process each PDF sequentially
      for (let i = 0; i < allPDFs.length; i++) {
        try {
          await processPDF(allPDFs[i]);
        } catch (err: any) {
          setErrors((prev) => [...prev, err.message]);
        }
      }

      setImportProgress({ stage: 'done', current: 1, total: 1, message: 'All imports complete!' });
      setImporting(false);
    },
    [importing, processPDF, setImportProgress],
  );

  /* ---------- re-process failed papers ---------- */
  const reprocessPaper = useCallback(
    async (paper: Paper) => {
      if (importing || !paper.rawText || !paper.id) return;
      setImporting(true);
      setErrors([]);

      try {
        // Remove old questions for this paper
        await db.questions.where('paperId').equals(paper.id).delete();

        // Reset paper status
        await db.papers.update(paper.id, { status: 'splitting', errorMessage: undefined });

        const parsed = splitIntoQuestions(paper.rawText, paper.year);
        if (!parsed.length) {
          await db.papers.update(paper.id, { status: 'error', errorMessage: 'No questions found' });
          throw new Error('No questions found');
        }

        await db.papers.update(paper.id, { status: 'classifying', totalQuestions: parsed.length });

        let totalMarks = 0;
        for (let i = 0; i < parsed.length; i++) {
          const q = parsed[i];
          setImportProgress({
            stage: 'classifying',
            current: i + 1,
            total: parsed.length,
            message: `Re-classifying question ${i + 1} of ${parsed.length}...`,
            paperId: paper.id,
          });

          let classification: any = {};
          try {
            classification = await classifyQuestion(q.text, q.options || []);
          } catch {
            classification = { subject: '', topic: '', subtopic: '', concept: '', difficulty: 'medium' };
          }

          const marks = q.marks || 1;
          totalMarks += marks;

          await db.questions.add({
            paperId: paper.id,
            year: paper.year,
            questionNumber: q.questionNumber ?? i + 1,
            paper: paper.filename,
            subject: classification.subject || '',
            topic: classification.topic || '',
            subtopic: classification.subtopic || '',
            concept: classification.concept || '',
            difficulty: classification.difficulty || 'medium',
            marks,
            type: q.type || 'MCQ',
            question: q.text,
            options: q.options || [],
            answer: '',
            officialExplanation: '',
            aiExplanation: '',
            images: [],
            confidence: classification.confidence ?? 0,
            needsReview: !classification.subject,
            bookmarked: false,
            solved: false,
            revisionStage: 0,
            notes: '',
            relatedQuestions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await db.papers.update(paper.id, { status: 'done', totalMarks });
      } catch (err: any) {
        setErrors((prev) => [...prev, err.message]);
      }

      setImportProgress({ stage: 'done', current: 1, total: 1, message: 'Re-processing complete!' });
      setImporting(false);
    },
    [importing, setImportProgress],
  );

  /* ---------- dropzone ---------- */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    multiple: true,
    disabled: importing,
  });

  const failedPapers = papers?.filter((p) => p.status === 'error') || [];

  /* ---------- render ---------- */
  return (
    <div className="fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Import Papers</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Upload GATE previous year question papers in PDF or ZIP format. Papers will be parsed,
          split into individual questions, and classified by subject and topic using AI.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
          importing
            ? 'pointer-events-none border-[var(--color-border)] opacity-60'
            : isDragActive
              ? 'border-indigo-400 bg-indigo-500/5'
              : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-indigo-400/50 hover:bg-indigo-500/5'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
              isDragActive
                ? 'scale-110 bg-indigo-500/20'
                : 'bg-indigo-500/10 group-hover:scale-105'
            }`}
          >
            <Upload
              className={`h-7 w-7 transition-colors ${
                isDragActive ? 'text-indigo-300' : 'text-indigo-400'
              }`}
            />
          </div>
          <p className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            or click to browse from your computer
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              <FileText className="h-3.5 w-3.5" />
              PDF
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
              <Archive className="h-3.5 w-3.5" />
              ZIP
            </span>
          </div>
        </div>

        {/* Animated border glow on drag */}
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-indigo-400/40 ring-offset-2 ring-offset-[var(--color-bg-primary)]" />
        )}
      </div>

      {/* Progress */}
      {importing && importProgress && <ProgressBar progress={importProgress} />}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{err}</p>
            </div>
          ))}
        </div>
      )}

      {/* Failed papers - reprocess */}
      {failedPapers.length > 0 && !importing && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Failed Imports ({failedPapers.length})
          </h3>
          <div className="space-y-2">
            {failedPapers.map((paper) => (
              <div
                key={paper.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {paper.filename}
                  </p>
                  {paper.errorMessage && (
                    <p className="mt-0.5 text-xs text-red-400">{paper.errorMessage}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reprocessPaper(paper);
                  }}
                  className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previously imported papers */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Imported Papers
        </h3>

        {!papers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <FileText className="h-6 w-6 text-indigo-400" />
            </div>
            <p className="mb-1 text-sm font-medium text-[var(--color-text-primary)]">No papers yet</p>
            <p className="max-w-xs text-xs text-[var(--color-text-secondary)]">
              Upload your first GATE question paper to begin building your question bank.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {papers.map((paper) => (
              <div key={paper.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
                  <FileText className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {paper.filename}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span>{paper.year}</span>
                    <span>{paper.totalQuestions} questions</span>
                    <span>{paper.totalMarks} marks</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={paper.status} />
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                    <Clock className="h-3 w-3" />
                    {new Date(paper.importedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import pipeline info */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Import Pipeline
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            { step: '1', label: 'Extract', desc: 'Parse PDF text content', icon: FileText },
            { step: '2', label: 'Split', desc: 'Identify individual questions', icon: Layers },
            { step: '3', label: 'Classify', desc: 'AI subject & topic tagging', icon: Sparkles },
            { step: '4', label: 'Store', desc: 'Save to question bank', icon: CheckCircle2 },
          ].map(({ step, label, desc, icon: Icon }, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-400">
                {step}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{desc}</p>
              </div>
              {i < 3 && <ArrowRight className="ml-auto hidden h-4 w-4 text-[var(--color-text-tertiary)] sm:block" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
