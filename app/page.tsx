'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  Download,
  FileSpreadsheet,
  Sun,
  Moon,
  RotateCcw,
  Plus,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import {
  CategoryId,
  NoteEntry,
  AIInsightSummary,
  RelatedNewsItem,
  INITIAL_NOTES,
  INITIAL_INSIGHTS,
  INITIAL_NEWS,
  inferCategoryAndTagsLocal,
} from '@/lib/chrononote-data';
import QuickCaptureBar from '@/components/QuickCaptureBar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import RecordsTimelineAndCalendar from '@/components/RecordsTimelineAndCalendar';
import AIInsightsAndNewsPanel from '@/components/AIInsightsAndNewsPanel';

const STORAGE_KEY_NOTES = 'chrononote_entries_v1';
const STORAGE_KEY_INSIGHTS = 'chrononote_insights_v1';
const STORAGE_KEY_NEWS = 'chrononote_news_v1';
const STORAGE_KEY_THEME = 'chrononote_theme_v1';

export default function ChronoNotePage() {
  const [notes, setNotes] = useState<NoteEntry[]>(INITIAL_NOTES);
  const [insights, setInsights] = useState<AIInsightSummary>(INITIAL_INSIGHTS);
  const [news, setNews] = useState<RelatedNewsItem[]>(INITIAL_NEWS);
  const [groundingLinks, setGroundingLinks] = useState<
    {title: string; uri: string}[]
  >([]);
  const [groundedSummaryText, setGroundedSummaryText] = useState<string>('');
  const [activeQueryTopic, setActiveQueryTopic] = useState<string>('');
  const [hasFetchedLiveAI, setHasFetchedLiveAI] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState<
    'timeline' | 'calendar' | 'dashboard' | 'insights'
  >('timeline');

  // Filters & View State
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'ALL'>(
    'ALL'
  );
  const [selectedYearMonth, setSelectedYearMonth] = useState<string | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Async AI states & UI Toast feedback
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const quickInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Load persisted data from LocalStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEY_NOTES);
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
        }
      }

      const savedInsights = localStorage.getItem(STORAGE_KEY_INSIGHTS);
      if (savedInsights) {
        const parsedIns = JSON.parse(savedInsights);
        if (parsedIns && parsedIns.headline) {
          setInsights(parsedIns);
        }
      }

      const savedNews = localStorage.getItem(STORAGE_KEY_NEWS);
      if (savedNews) {
        const parsedNews = JSON.parse(savedNews);
        if (Array.isArray(parsedNews) && parsedNews.length > 0) {
          setNews(parsedNews);
        }
      }

      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'light') {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      console.error('LocalStorage load error:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save notes to LocalStorage whenever updated
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [notes, isHydrated]);

  // Global keyboard shortcut: Cmd/Ctrl + K to focus Quick Input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        quickInputRef.current?.focus();
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Refresh AI Insights & Related News via Gemini API + Google Search Grounding
  const handleRefreshInsights = useCallback(
    async (focusTopic?: string, currentNotesList?: NoteEntry[]) => {
      const targetNotes = currentNotesList || notes;
      if (targetNotes.length === 0) return;

      setIsRefreshingInsights(true);
      setInsightsError(null);

      try {
        const res = await fetch('/api/gemini/insights', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            notes: targetNotes.slice(0, 25),
            focusTopic: focusTopic || '',
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setInsightsError(
            data.error ||
              'Gemini APIによるトレンド分析・ニュース取得に失敗しました。'
          );
          return;
        }

        if (data.insights) {
          setInsights(data.insights);
          localStorage.setItem(
            STORAGE_KEY_INSIGHTS,
            JSON.stringify(data.insights)
          );
        }
        if (Array.isArray(data.news) && data.news.length > 0) {
          setNews(data.news);
          localStorage.setItem(STORAGE_KEY_NEWS, JSON.stringify(data.news));
        }
        if (Array.isArray(data.groundingLinks)) {
          setGroundingLinks(data.groundingLinks);
        }
        if (typeof data.groundedSummaryText === 'string') {
          setGroundedSummaryText(data.groundedSummaryText);
        }
        if (typeof data.queryTopic === 'string') {
          setActiveQueryTopic(data.queryTopic);
        }

        setHasFetchedLiveAI(true);
        showToast(
          focusTopic
            ? `「#${focusTopic}」のAIトレンド要約と最新Webニュースを取得しました`
            : '保存メモをもとにAI関心トレンドと最新Webニュースを更新しました'
        );
      } catch (err) {
        console.error('Failed to fetch Gemini insights:', err);
        setInsightsError(
          'サーバー通信エラーが発生しました。ネットワーク接続を確認して再度お試しください。'
        );
      } finally {
        setIsRefreshingInsights(false);
      }
    },
    [notes, showToast]
  );

  // Trigger real Gemini analysis when user clicks the "AIインサイト" tab
  const handleOpenInsightsTab = () => {
    setActiveNavTab('insights');
    const el = document.getElementById('insights-section');
    if (el) {
      el.scrollIntoView({behavior: 'smooth'});
    }
    if (!isRefreshingInsights) {
      handleRefreshInsights();
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  };

  const focusQuickInput = () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
    setTimeout(() => {
      quickInputRef.current?.focus();
    }, 100);
  };

  // Add new note with instant local save + background Gemini classification enrichment
  const handleAddNote = async (payload: {
    content: string;
    category: CategoryId;
    tags: string[];
    aiNote: string;
    manualCategoryOverride: boolean;
  }) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const dateStr = `${yearMonth}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const id = `note-${Date.now()}`;

    const newEntry: NoteEntry = {
      id,
      content: payload.content,
      category: payload.category,
      tags: payload.tags,
      createdAt: now.toISOString(),
      yearMonth,
      dateStr,
      timeStr,
      aiNote: payload.aiNote,
      isPinned: false,
      aiProcessed: false,
    };

    // 1. Optimistic 0-latency save
    setNotes((prev) => [newEntry, ...prev]);
    showToast(`「${payload.category}」に記録しました (${dateStr} ${timeStr})`);

    // 2. Background Gemini AI enrichment
    setIsAiClassifying(true);
    try {
      const res = await fetch('/api/gemini/classify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: payload.content}),
      });
      if (res.ok) {
        const aiData = await res.json();
        if (aiData && !aiData.error) {
          setNotes((prev) =>
            prev.map((item) => {
              if (item.id !== id) return item;
              const mergedTags = Array.from(
                new Set([...item.tags, ...(aiData.tags || [])])
              ).slice(0, 5);
              return {
                ...item,
                category: payload.manualCategoryOverride
                  ? item.category
                  : aiData.category || item.category,
                tags: mergedTags,
                aiNote: aiData.aiNote || item.aiNote,
                aiProcessed: true,
              };
            })
          );
        }
      }
    } catch {
      // Fallback already applied
    } finally {
      setIsAiClassifying(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('記録を削除しました');
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? {...n, isPinned: !n.isPinned} : n))
    );
  };

  const handleUpdateNote = (
    id: string,
    newContent: string,
    newCategory: CategoryId
  ) => {
    const reInferred = inferCategoryAndTagsLocal(newContent);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              content: newContent,
              category: newCategory,
              tags: Array.from(new Set([...n.tags, ...reInferred.tags])).slice(
                0,
                5
              ),
            }
          : n
      )
    );
    showToast('記録を更新しました');
  };

  // Export JSON
  const handleExportJSON = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      totalCount: notes.length,
      notes,
      insights,
      news,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chrononote-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`JSONファイルをエクスポートしました (${notes.length}件)`);
  };

  // Export CSV (with UTF-8 BOM for Excel compatibility)
  const handleExportCSV = () => {
    const headers = [
      'ID',
      '登録日時',
      '年月',
      '分野カテゴリ',
      'タグ',
      '記録内容',
      'AIインサイトメモ',
      'ピン留め',
    ];
    const escapeCsv = (str: string) =>
      `"${String(str ?? '').replace(/"/g, '""')}"`;

    const rows = notes.map((n) => [
      escapeCsv(n.id),
      escapeCsv(`${n.dateStr} ${n.timeStr}`),
      escapeCsv(n.yearMonth),
      escapeCsv(n.category),
      escapeCsv(n.tags.join(', ')),
      escapeCsv(n.content),
      escapeCsv(n.aiNote || ''),
      escapeCsv(n.isPinned ? 'Yes' : 'No'),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chrononote-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`CSVファイルをエクスポートしました (${notes.length}件)`);
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        const importedNotes = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.notes)
          ? parsed.notes
          : null;
        if (importedNotes && importedNotes.length > 0) {
          setNotes(importedNotes);
          showToast(`${importedNotes.length}件の記録をインポートしました`);
        } else {
          showToast('有効な記録データが見つかりませんでした');
        }
      } catch {
        showToast('JSONファイルの解析に失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetSampleData = () => {
    setNotes(INITIAL_NOTES);
    setInsights(INITIAL_INSIGHTS);
    setNews(INITIAL_NEWS);
    setGroundingLinks([]);
    setGroundedSummaryText('');
    setHasFetchedLiveAI(false);
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(INITIAL_NOTES));
    localStorage.setItem(
      STORAGE_KEY_INSIGHTS,
      JSON.stringify(INITIAL_INSIGHTS)
    );
    localStorage.removeItem(STORAGE_KEY_NEWS);
    setSelectedCategory('ALL');
    setSelectedYearMonth('ALL');
    setSearchQuery('');
    setConfirmResetOpen(false);
    showToast('初期サンプルデータを復元しました');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-20 md:pb-12">
      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Wordmark (single text element) */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            ChronoNote
          </a>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav
            aria-label="メインナビゲーション"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            <a
              href="#records-section"
              onClick={() => {
                setActiveNavTab('timeline');
                setViewMode('timeline');
              }}
              className={`hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeNavTab === 'timeline'
                  ? 'text-sky-500 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              タイムライン
            </a>
            <a
              href="#records-section"
              onClick={() => {
                setActiveNavTab('calendar');
                setViewMode('calendar');
              }}
              className={`hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeNavTab === 'calendar'
                  ? 'text-sky-500 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              カレンダー
            </a>
            <a
              href="#dashboard-section"
              onClick={() => setActiveNavTab('dashboard')}
              className={`hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeNavTab === 'dashboard'
                  ? 'text-sky-500 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              ダッシュボード
            </a>
            <button
              type="button"
              onClick={handleOpenInsightsTab}
              className={`hover:text-slate-900 dark:hover:text-slate-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeNavTab === 'insights'
                  ? 'text-sky-500 dark:text-sky-400 font-semibold'
                  : ''
              }`}
            >
              AIインサイト
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={focusQuickInput}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              クイック記録 (⌘K)
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main
        id="top"
        className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-6 space-y-8"
      >
        {/* Workspace Utility Bar: Intro + Data Export/Import + Dark Mode Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              パーソナル記録＆AIトレンド分析ワークスペース
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              日々の思いつき・仕事・学習・健康メモをキーボードや音声入力で1秒ストック。Gemini APIとGoogle検索連携で関心トレンドと最新ニュースを自動分析します。
            </p>
          </div>

          {/* Data Management & Theme Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenInsightsTab}
              disabled={isRefreshingInsights}
              className="md:hidden px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              AIインサイト分析
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download CSV</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>JSON読込</span>
            </button>

            {!confirmResetOpen ? (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>サンプル復元</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-amber-500/40">
                <span className="text-xs text-amber-400 whitespace-nowrap">
                  初期データに戻しますか？
                </span>
                <button
                  type="button"
                  onClick={handleResetSampleData}
                  className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  実行
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  取消
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="テーマ切り替え"
              title={isDarkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            role="status"
            className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs sm:text-sm text-sky-300 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Section 1: Quick Capture Area (with Web Speech API voice input) */}
        <QuickCaptureBar
          onAddNote={handleAddNote}
          inputRef={quickInputRef}
          isAiClassifying={isAiClassifying}
        />

        {/* Section 2: Analytics Dashboard (Category Breakdown & Monthly Trend Charts) */}
        <div id="dashboard-section" className="scroll-mt-20">
          <AnalyticsDashboard
            notes={notes}
            selectedCategory={selectedCategory}
            selectedYearMonth={selectedYearMonth}
            onSelectCategory={setSelectedCategory}
            onSelectYearMonth={setSelectedYearMonth}
          />
        </div>

        {/* Section 3 & 4: Main 2-Column Workspace (Left: Filterable Records Timeline/Calendar, Right: AI Insights & Related News) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div id="records-section" className="lg:col-span-7 scroll-mt-20">
            <RecordsTimelineAndCalendar
              notes={notes}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedYearMonth={selectedYearMonth}
              onSelectYearMonth={setSelectedYearMonth}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              onUpdateNote={handleUpdateNote}
              onFocusQuickInput={focusQuickInput}
            />
          </div>

          <div id="insights-section" className="lg:col-span-5 scroll-mt-20">
            <AIInsightsAndNewsPanel
              notes={notes}
              insights={insights}
              news={news}
              groundingLinks={groundingLinks}
              groundedSummaryText={groundedSummaryText}
              activeQueryTopic={activeQueryTopic}
              isRefreshingInsights={isRefreshingInsights}
              insightsError={insightsError}
              hasFetchedLiveAI={hasFetchedLiveAI}
              onRefreshInsights={(topic) => handleRefreshInsights(topic)}
              onSelectTopicFilter={(topic) => setSearchQuery(topic)}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating Quick Capture Trigger (Compact, well within 15% mobile sticky cap) */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={focusQuickInput}
          className="px-4 py-2.5 rounded-full bg-sky-500 text-slate-950 font-semibold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>1秒メモ入力</span>
        </button>
      </div>
    </div>
  );
}
