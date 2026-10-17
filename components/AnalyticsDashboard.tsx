'use client';

import React, {useMemo} from 'react';
import {BarChart3, TrendingUp, Layers, Calendar} from 'lucide-react';
import {CATEGORIES, CategoryId, NoteEntry} from '@/lib/chrononote-data';

interface AnalyticsDashboardProps {
  notes: NoteEntry[];
  selectedCategory: CategoryId | 'ALL';
  selectedYearMonth: string | 'ALL';
  onSelectCategory: (cat: CategoryId | 'ALL') => void;
  onSelectYearMonth: (ym: string | 'ALL') => void;
}

export default function AnalyticsDashboard({
  notes,
  selectedCategory,
  selectedYearMonth,
  onSelectCategory,
  onSelectYearMonth,
}: AnalyticsDashboardProps) {
  // 1. Category counts
  const categoryStats = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      仕事: 0,
      アイデア: 0,
      学習: 0,
      健康: 0,
      買い物: 0,
      趣味: 0,
      その他: 0,
    };
    const filteredByMonth =
      selectedYearMonth === 'ALL'
        ? notes
        : notes.filter((n) => n.yearMonth === selectedYearMonth);

    for (const n of filteredByMonth) {
      counts[n.category] = (counts[n.category] || 0) + 1;
    }

    const total = filteredByMonth.length || 1;
    const maxCount = Math.max(...Object.values(counts), 1);

    return CATEGORIES.map((cat) => {
      const count = counts[cat.id] || 0;
      const share = Math.round((count / total) * 100);
      const barWidth = Math.round((count / maxCount) * 100);
      return {
        ...cat,
        count,
        share: filteredByMonth.length === 0 ? 0 : share,
        barWidth: filteredByMonth.length === 0 ? 0 : barWidth,
      };
    }).sort((a, b) => b.count - a.count);
  }, [notes, selectedYearMonth]);

  // 2. Monthly trend stats (last 6 months or all available months)
  const monthlyStats = useMemo(() => {
    const defaultMonths = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const monthSet = new Set<string>(defaultMonths);
    for (const n of notes) {
      if (n.yearMonth) monthSet.add(n.yearMonth);
    }
    const sortedMonths = Array.from(monthSet).sort();

    const data = sortedMonths.map((ym) => {
      const monthNotes = notes.filter(
        (n) =>
          n.yearMonth === ym &&
          (selectedCategory === 'ALL' || n.category === selectedCategory)
      );
      const byCategory: Record<string, number> = {};
      for (const n of monthNotes) {
        byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      }
      const [year, month] = ym.split('-');
      return {
        yearMonth: ym,
        label: `${Number(month)}月`,
        fullLabel: `${year}年${Number(month)}月`,
        total: monthNotes.length,
        byCategory,
      };
    });

    const maxTotal = Math.max(...data.map((d) => d.total), 1);
    return {data, maxTotal};
  }, [notes, selectedCategory]);

  // 3. KPI metrics
  const kpis = useMemo(() => {
    const currentMonthNotes = notes.filter((n) => n.yearMonth === '2026-10');
    const uniqueTags = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags) uniqueTags.add(t);
    }
    const topCategory = categoryStats[0]?.count > 0 ? categoryStats[0].label : '—';
    return {
      totalNotes: notes.length,
      currentMonthCount: currentMonthNotes.length,
      topCategory,
      uniqueTagsCount: uniqueTags.size,
    };
  }, [notes, categoryStats]);

  return (
    <section aria-label="記録統計ダッシュボード" className="space-y-6">
      {/* Top 4 KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            総ストック記録数
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {kpis.totalNotes}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              件保存済
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            今月（2026年10月）の記録
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-sky-500 dark:text-sky-400 font-mono tabular-nums">
              {kpis.currentMonthCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              前月比 +40%
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            最多フォーカス分野
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.topCategory}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {categoryStats[0]?.share ?? 0}% 占有
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            AI抽出トピックタグ
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {kpis.uniqueTagsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              タグ自動付与
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid: Category Distribution & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  分野別（カテゴリ）記録分布
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                行クリックで絞り込み
              </span>
            </div>

            <div className="space-y-2.5">
              {categoryStats.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      onSelectCategory(isSelected ? 'ALL' : cat.id)
                    }
                    className={`w-full text-left group rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 ring-1 ring-sky-500/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {cat.label}{' '}
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          · {cat.enLabel}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {cat.count}件 · {cat.share}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${cat.barClass}`}
                        style={{width: `${Math.max(cat.barWidth, cat.count > 0 ? 6 : 0)}%`}}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCategory !== 'ALL' && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-sky-400">
                現在「{selectedCategory}」でフィルタ中
              </span>
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className="text-slate-500 hover:text-slate-200 underline cursor-pointer"
              >
                フィルタ解除
              </button>
            </div>
          )}
        </div>

        {/* Monthly Trend Bar Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  月別記録推移（タイムライン集計）
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                2026年
              </span>
            </div>

            {/* Vertical Bar Chart */}
            <div className="h-48 pt-6 pb-2 px-2 flex items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
              {monthlyStats.data.map((m) => {
                const heightPercent = Math.round(
                  (m.total / monthlyStats.maxTotal) * 100
                );
                const isSelected = selectedYearMonth === m.yearMonth;

                return (
                  <button
                    key={m.yearMonth}
                    type="button"
                    onClick={() =>
                      onSelectYearMonth(isSelected ? 'ALL' : m.yearMonth)
                    }
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                    title={`${m.fullLabel}: ${m.total}件（クリックで月別フィルタ）`}
                  >
                    <span
                      className={`text-xs font-mono tabular-nums transition-colors ${
                        isSelected
                          ? 'text-sky-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {m.total}
                    </span>
                    <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-800/70 rounded-t-md h-32 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          isSelected
                            ? 'bg-sky-400'
                            : 'bg-sky-500/75 group-hover:bg-sky-400'
                        }`}
                        style={{
                          height: `${Math.max(heightPercent, m.total > 0 ? 10 : 0)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-mono tabular-nums whitespace-nowrap ${
                        isSelected
                          ? 'text-sky-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {selectedYearMonth === 'ALL'
                  ? '棒グラフをクリックすると年月で絞り込めます'
                  : `選択中: ${selectedYearMonth}`}
              </span>
            </div>
            {selectedYearMonth !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectYearMonth('ALL')}
                className="text-sky-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                全期間を表示
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
