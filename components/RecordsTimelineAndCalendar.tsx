'use client';

import React, {useState, useMemo} from 'react';
import {
  Search,
  X,
  Calendar as CalendarIcon,
  ListFilter,
  Pin,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CATEGORIES,
  CategoryId,
  NoteEntry,
  MAX_NOTE_LENGTH,
  getCurrentJSTDateParts,
} from '@/lib/chrononote-data';

interface RecordsTimelineAndCalendarProps {
  notes: NoteEntry[];
  viewMode: 'timeline' | 'calendar';
  onViewModeChange: (mode: 'timeline' | 'calendar') => void;
  selectedCategory: CategoryId | 'ALL';
  onSelectCategory: (cat: CategoryId | 'ALL') => void;
  selectedYearMonth: string | 'ALL';
  onSelectYearMonth: (ym: string | 'ALL') => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdateNote: (
    id: string,
    newContent: string,
    newCategory: CategoryId,
    newTags: string[]
  ) => void;
  onFocusQuickInput: () => void;
}

export default function RecordsTimelineAndCalendar({
  notes,
  viewMode,
  onViewModeChange,
  selectedCategory,
  onSelectCategory,
  selectedYearMonth,
  onSelectYearMonth,
  searchQuery,
  onSearchQueryChange,
  onDeleteNote,
  onTogglePin,
  onUpdateNote,
  onFocusQuickInput,
}: RecordsTimelineAndCalendarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<CategoryId>('仕事');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);
  const [calendarMonth, setCalendarMonth] = useState<string>(
    () => getCurrentJSTDateParts().yearMonth
  );

  // Available Year-Months (only current JST yearMonth + actual notes' yearMonths)
  const availableYearMonths = useMemo(() => {
    const currentYm = getCurrentJSTDateParts().yearMonth;
    const set = new Set<string>([currentYm]);
    for (const n of notes) {
      if (n.yearMonth) set.add(n.yearMonth);
    }
    return Array.from(set).sort().reverse();
  }, [notes]);

  // Top frequent tags for quick filtering
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      for (const t of n.tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({tag, count}));
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (selectedCategory !== 'ALL' && n.category !== selectedCategory) {
          return false;
        }
        if (selectedYearMonth !== 'ALL' && n.yearMonth !== selectedYearMonth) {
          return false;
        }
        if (
          viewMode === 'calendar' &&
          selectedCalendarDate &&
          n.dateStr !== selectedCalendarDate
        ) {
          return false;
        }
        if (q) {
          const inContent = n.content.toLowerCase().includes(q);
          const inCategory = n.category.toLowerCase().includes(q);
          const inTags = n.tags.some((t) => t.toLowerCase().includes(q));
          const inAiNote = (n.aiNote || '').toLowerCase().includes(q);
          return inContent || inCategory || inTags || inAiNote;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [
    notes,
    selectedCategory,
    selectedYearMonth,
    searchQuery,
    viewMode,
    selectedCalendarDate,
  ]);

  // Group filtered notes by Year-Month for Timeline view
  // Month groups are strictly sorted by yearMonth descending, and items within each month are sorted by isPinned then createdAt descending
  const groupedByMonth = useMemo(() => {
    const currentYm = getCurrentJSTDateParts().yearMonth;
    const map = new Map<string, NoteEntry[]>();
    for (const item of filteredNotes) {
      const ym = item.yearMonth || currentYm;
      if (!map.has(ym)) {
        map.set(ym, []);
      }
      map.get(ym)!.push(item);
    }
    const sortedYearMonths = Array.from(map.keys()).sort((a, b) =>
      b.localeCompare(a)
    );
    return sortedYearMonths.map((yearMonth) => {
      const items = [...(map.get(yearMonth) || [])].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      return {yearMonth, items};
    });
  }, [filteredNotes]);

  // Calendar grid generation for `calendarMonth`
  const calendarDays = useMemo(() => {
    const currentYm = getCurrentJSTDateParts().yearMonth;
    const [defaultY, defaultM] = currentYm.split('-').map(Number);
    const [yearStr, monthStr] = calendarMonth.split('-');
    const year = Number(yearStr) || defaultY;
    const monthIndex = (Number(monthStr) || defaultM) - 1;

    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const notesByDate: Record<string, NoteEntry[]> = {};
    for (const n of notes) {
      if (
        n.yearMonth === calendarMonth &&
        (selectedCategory === 'ALL' || n.category === selectedCategory)
      ) {
        if (!notesByDate[n.dateStr]) notesByDate[n.dateStr] = [];
        notesByDate[n.dateStr].push(n);
      }
    }

    const cells: {
      day: number | null;
      dateStr: string | null;
      entries: NoteEntry[];
    }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({day: null, dateStr: null, entries: []});
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const padM = String(monthIndex + 1).padStart(2, '0');
      const padD = String(d).padStart(2, '0');
      const dateStr = `${year}-${padM}-${padD}`;
      cells.push({
        day: d,
        dateStr,
        entries: notesByDate[dateStr] || [],
      });
    }
    return cells;
  }, [calendarMonth, notes, selectedCategory]);

  const handleStartEdit = (note: NoteEntry) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
    setEditTags([...note.tags]);
    setEditTagInput('');
  };

  const handleAddEditTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editTagInput.trim()) {
      e.preventDefault();
      const cleanTag = editTagInput.trim().replace(/^[#＃]/, '');
      if (cleanTag && !editTags.includes(cleanTag)) {
        setEditTags((prev) => [...prev, cleanTag].slice(0, 8));
      }
      setEditTagInput('');
    }
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    onUpdateNote(id, editContent.trim(), editCategory, editTags);
    setEditingId(null);
  };

  const shiftCalendarMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(nextYm);
    setSelectedCalendarDate(null);
    if (selectedYearMonth !== 'ALL') {
      onSelectYearMonth(nextYm);
    }
  };

  const getCategoryColorClass = (cat: CategoryId) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.textClass : 'text-slate-400';
  };

  return (
    <section aria-label="記録フィルタリング＆一覧ビュー" className="space-y-5">
      {/* Filter & Search Control Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 sm:p-5 space-y-4">
        {/* Row 1: Search Input + Year-Month Select + View Mode Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="キーワード・#タグ・AIメモで瞬時に検索..."
              aria-label="記録をキーワード検索"
              className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                aria-label="検索クリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Year-Month Dropdown & Segmented View Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={selectedYearMonth}
              onChange={(e) => {
                const val = e.target.value;
                onSelectYearMonth(val);
                if (val !== 'ALL') {
                  setCalendarMonth(val);
                }
                setSelectedCalendarDate(null);
              }}
              aria-label="年月で絞り込み"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono tabular-nums text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">全期間 ({notes.length}件)</option>
              {availableYearMonths.map((ym) => {
                const count = notes.filter((n) => n.yearMonth === ym).length;
                const [y, m] = ym.split('-');
                return (
                  <option key={ym} value={ym}>
                    {y}年{Number(m)}月 ({count}件)
                  </option>
                );
              })}
            </select>

            {/* Segmented View Switcher */}
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('timeline');
                  setSelectedCalendarDate(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>タイムライン</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('calendar')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>カレンダー</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category Segmented Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelectCategory('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            すべて ({notes.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = notes.filter((n) => n.category === cat.id).length;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onSelectCategory(active ? 'ALL' : cat.id)
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums ${
                  active
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Row 3: Quick Tag Filter Buttons */}
        {topTags.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800/70">
            <span className="shrink-0">頻出タグ:</span>
            {topTags.map(({tag, count}) => {
              const isTagActive = searchQuery.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    onSearchQueryChange(isTagActive ? '' : tag)
                  }
                  className={`px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isTagActive
                      ? 'bg-sky-500/20 text-sky-400 font-semibold'
                      : 'hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  #{tag} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar View (When active) */}
      {viewMode === 'calendar' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {calendarMonth.replace('-', '年')}月 カレンダーログ
              </h3>
              {selectedCalendarDate && (
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  日付選択を解除 ({selectedCalendarDate})
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftCalendarMonth(-1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                aria-label="前月へ"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentYm = getCurrentJSTDateParts().yearMonth;
                  setCalendarMonth(currentYm);
                  setSelectedCalendarDate(null);
                  if (selectedYearMonth !== 'ALL') {
                    onSelectYearMonth(currentYm);
                  }
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer"
              >
                今月
              </button>
              <button
                type="button"
                onClick={() => shiftCalendarMonth(1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                aria-label="翌月へ"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 rounded-lg bg-slate-50/40 dark:bg-slate-950/30"
                  />
                );
              }
              const hasEntries = cell.entries.length > 0;
              const isSelected = selectedCalendarDate === cell.dateStr;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedCalendarDate(
                      isSelected ? null : cell.dateStr
                    )
                  }
                  className={`h-20 rounded-lg p-2 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10'
                      : hasEntries
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-sky-500/50'
                      : 'border-slate-100 dark:border-slate-800/50 bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isSelected
                          ? 'text-sky-400 font-bold'
                          : hasEntries
                          ? 'text-slate-900 dark:text-slate-100 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {hasEntries && (
                      <span className="text-[11px] font-mono tabular-nums text-sky-400">
                        {cell.entries.length}件
                      </span>
                    )}
                  </div>

                  {hasEntries && (
                    <div className="space-y-0.5 overflow-hidden">
                      {cell.entries.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className="text-[11px] text-slate-600 dark:text-slate-300 truncate leading-tight"
                        >
                          {e.category} · {e.content}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Header Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="font-mono tabular-nums">
          表示中: {filteredNotes.length}件 / 全{notes.length}件
        </span>
        {(selectedCategory !== 'ALL' ||
          selectedYearMonth !== 'ALL' ||
          searchQuery ||
          selectedCalendarDate) && (
          <button
            type="button"
            onClick={() => {
              onSelectCategory('ALL');
              onSelectYearMonth('ALL');
              onSearchQueryChange('');
              setSelectedCalendarDate(null);
            }}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            すべての絞り込みをリセット
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-10 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            条件に一致する記録が見つかりませんでした。
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                onSelectCategory('ALL');
                onSelectYearMonth('ALL');
                onSearchQueryChange('');
                setSelectedCalendarDate(null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              フィルタを解除
            </button>
            <button
              type="button"
              onClick={onFocusQuickInput}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
            >
              最初のメモを記録する
            </button>
          </div>
        </div>
      ) : (
        /* Grouped Timeline List */
        <div className="space-y-6">
          {groupedByMonth.map((group) => {
            const [y, m] = group.yearMonth.split('-');
            return (
              <div key={group.yearMonth} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                    {y}年{Number(m)}月
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {group.items.length}件の記録
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
                  {group.items.map((note) => {
                    const isEditing = editingId === note.id;
                    return (
                      <article
                        key={note.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              maxLength={MAX_NOTE_LENGTH}
                              rows={3}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                            />
                            {/* Tag Editing Bar */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {editTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                                >
                                  <span>#{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditTag(tag)}
                                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                                    aria-label={`タグ ${tag} を削除`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                value={editTagInput}
                                onChange={(e) => setEditTagInput(e.target.value)}
                                onKeyDown={handleAddEditTag}
                                placeholder="+タグ追加(Enter)"
                                aria-label="編集中のメモにタグを追加"
                                className="w-32 px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {CATEGORIES.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setEditCategory(c.id)}
                                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                                      editCategory === c.id
                                        ? 'bg-sky-500 text-slate-950'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  キャンセル
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(note.id)}
                                  className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  保存
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Zero-Pill Metadata Line: Clean unboxed inline text with typographic separators */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span
                                  className={`font-semibold ${getCategoryColorClass(
                                    note.category
                                  )}`}
                                >
                                  {note.category}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {note.dateStr} {note.timeStr}
                                </span>
                                {note.tags.length > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {note.tags.map((t) => `#${t}`).join('  ')}
                                    </span>
                                  </>
                                )}
                                {note.isPinned && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-amber-400 font-medium">
                                      ピン留め済
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Interactive Row Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onTogglePin(note.id)}
                                  className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                    note.isPinned
                                      ? 'text-amber-400'
                                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                  title={
                                    note.isPinned
                                      ? 'ピン留めを解除'
                                      : '上部にピン留め'
                                  }
                                  aria-label="ピン留め切替"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(note)}
                                  className="p-1.5 rounded text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="編集"
                                  aria-label="編集"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteNote(note.id)}
                                  className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="削除"
                                  aria-label="削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Primary Note Content */}
                            <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                              {note.content}
                            </p>

                            {/* Quiet 1-line AI Insight Note */}
                            {note.aiNote && (
                              <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>AIメモ: {note.aiNote}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
