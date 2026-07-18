import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import {
  Settings as SettingsIcon,
  Key,
  Sun,
  Moon,
  Monitor,
  Gamepad2,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  Check,
  Loader2,
  Info,
  X,
  Sparkles,
  Database,
  SlidersHorizontal,
  Shield,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { db } from '@/lib/db';

type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
        <Icon className="w-5 h-5 text-indigo-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
      <Check className="w-4 h-4 text-green-400 dark:text-green-600" />
      {message}
      <button type="button" onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.toArray()) ?? [];

  const getSetting = useCallback(
    (key: string, defaultValue: unknown = '') => {
      const found = settings.find((s) => s.key === key);
      return found ? found.value : defaultValue;
    },
    [settings]
  );

  // AI Configuration
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');

  // Theme
  const [theme, setTheme] = useState<ThemeMode>('system');

  // Practice Defaults
  const [defaultMode, setDefaultMode] = useState('random');
  const [defaultCount, setDefaultCount] = useState(20);

  // Import Preferences
  const [autoClassify, setAutoClassify] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // UI state
  const [toast, setToast] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings on mount / when settings change
  useEffect(() => {
    if (settings.length === 0) return;
    setApiKey(getSetting('apiKey', '') as string);
    setAiModel(getSetting('aiModel', 'gpt-4o-mini') as string);
    setDefaultMode(getSetting('defaultPracticeMode', 'random') as string);
    setDefaultCount(getSetting('defaultQuestionCount', 20) as number);
    setAutoClassify(getSetting('autoClassify', true) as boolean);
    setConfidenceThreshold(getSetting('confidenceThreshold', 0.7) as number);

    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme) setTheme(savedTheme);
  }, [settings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSetting = async (key: string, value: unknown) => {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id!, { value });
    } else {
      await db.settings.add({ key, value });
    }
  };

  const handleSaveAI = async () => {
    await saveSetting('apiKey', apiKey);
    await saveSetting('aiModel', aiModel);
    setToast('AI configuration saved');
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleSavePracticeDefaults = async () => {
    await saveSetting('defaultPracticeMode', defaultMode);
    await saveSetting('defaultQuestionCount', defaultCount);
    setToast('Practice defaults saved');
  };

  const handleSaveImportPrefs = async () => {
    await saveSetting('autoClassify', autoClassify);
    await saveSetting('confidenceThreshold', confidenceThreshold);
    setToast('Import preferences saved');
  };

  const handleClearAllData = async () => {
    setShowClearConfirm(false);
    await db.papers.clear();
    await db.questions.clear();
    await db.attempts.clear();
    await db.revisions.clear();
    await db.bookmarks.clear();
    await db.notes.clear();
    await db.analyticsCache.clear();
    await db.settings.clear();
    setToast('All data cleared successfully');
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        papers: await db.papers.toArray(),
        questions: await db.questions.toArray(),
        attempts: await db.attempts.toArray(),
        revisions: await db.revisions.toArray(),
        bookmarks: await db.bookmarks.toArray(),
        notes: await db.notes.toArray(),
        analyticsCache: await db.analyticsCache.toArray(),
        settings: await db.settings.toArray(),
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      saveAs(blob, `gate-cse-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setToast('Database exported successfully');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.papers) await db.papers.bulkAdd(data.papers).catch(() => {});
      if (data.questions) await db.questions.bulkAdd(data.questions).catch(() => {});
      if (data.attempts) await db.attempts.bulkAdd(data.attempts).catch(() => {});
      if (data.revisions) await db.revisions.bulkAdd(data.revisions).catch(() => {});
      if (data.bookmarks) await db.bookmarks.bulkAdd(data.bookmarks).catch(() => {});
      if (data.notes) await db.notes.bulkAdd(data.notes).catch(() => {});
      if (data.analyticsCache) await db.analyticsCache.bulkAdd(data.analyticsCache).catch(() => {});
      if (data.settings) await db.settings.bulkAdd(data.settings).catch(() => {});
      setToast('Database imported successfully');
    } catch {
      setToast('Failed to import database - invalid file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const practiceModesOptions = [
    { value: 'subject', label: 'By Subject' },
    { value: 'topic', label: 'By Topic' },
    { value: 'year', label: 'By Year' },
    { value: 'difficulty', label: 'By Difficulty' },
    { value: 'random', label: 'Random Mix' },
    { value: 'timed', label: 'Timed Practice' },
    { value: 'exam', label: 'Exam Simulation' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-indigo-500" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure your GATE CSE Master experience.
          </p>
        </div>

        <div className="space-y-6">
          {/* AI Configuration */}
          <Section title="AI Configuration" icon={Sparkles}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Stored locally in your browser. Never sent to our servers.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  AI Model
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                  <option value="claude-haiku-4-20250414">Claude Haiku 4</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveAI}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save AI Settings
              </button>
            </div>
          </Section>

          {/* Theme */}
          <Section title="Theme" icon={Sun}>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
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
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Practice Defaults */}
          <Section title="Practice Defaults" icon={Gamepad2}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Practice Mode
                </label>
                <select
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {practiceModesOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Question Count
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={defaultCount}
                  onChange={(e) => setDefaultCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                type="button"
                onClick={handleSavePracticeDefaults}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save Defaults
              </button>
            </div>
          </Section>

          {/* Import Preferences */}
          <Section title="Import Preferences" icon={SlidersHorizontal}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-classify questions
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Automatically classify imported questions by subject and topic
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoClassify}
                  onClick={() => setAutoClassify(!autoClassify)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoClassify ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoClassify ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confidence Threshold ({Math.round(confidenceThreshold * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveImportPrefs}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          </Section>

          {/* Data Management */}
          <Section title="Data Management" icon={Database}>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Database
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import Database
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  className="hidden"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This permanently deletes all questions, attempts, bookmarks, and settings.
                </p>
              </div>
            </div>
          </Section>

          {/* About */}
          <Section title="About" icon={Info}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Application</span>
                <span className="font-medium text-gray-900 dark:text-white">GATE CSE Master</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Version</span>
                <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400">
                  A comprehensive GATE Computer Science preparation tool with AI-powered question
                  analysis, spaced repetition, and detailed analytics. Built with React, TypeScript,
                  and Tailwind CSS.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear All Data"
        message="This will permanently delete all imported papers, questions, attempts, bookmarks, notes, and settings. This action cannot be undone."
        confirmLabel="Delete Everything"
        onConfirm={handleClearAllData}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
