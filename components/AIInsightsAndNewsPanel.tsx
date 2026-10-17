'use client';

import React, {useState, useMemo} from 'react';
import {
  Sparkles,
  RefreshCw,
  Newspaper,
  ExternalLink,
  Compass,
  ArrowUpRight,
  AlertCircle,
  Globe,
} from 'lucide-react';
import {
  AIInsightSummary,
  NoteEntry,
  RelatedNewsItem,
  CATEGORIES,
} from '@/lib/chrononote-data';

interface AIInsightsAndNewsPanelProps {
  notes: NoteEntry[];
  insights: AIInsightSummary;
  news: RelatedNewsItem[];
  groundingLinks: {title: string; uri: string}[];
  groundedSummaryText: string;
  activeQueryTopic?: string;
  isRefreshingInsights: boolean;
  insightsError: string | null;
  hasFetchedLiveAI: boolean;
  onRefreshInsights: (focusTopic?: string) => void;
  onSelectTopicFilter: (topic: string) => void;
}

export default function AIInsightsAndNewsPanel({
  notes,
  insights,
  news,
  groundingLinks,
  groundedSummaryText,
  activeQueryTopic,
  isRefreshingInsights,
  insightsError,
  hasFetchedLiveAI,
  onRefreshInsights,
  onSelectTopicFilter,
}: AIInsightsAndNewsPanelProps) {
  const [selectedNewsTopic, setSelectedNewsTopic] = useState<string>('ALL');

  // Compute dynamic interest keywords from user's actual notes
  const dynamicTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      for (const t of n.tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({tag, count}));
  }, [notes]);

  const filteredNews = useMemo(() => {
    if (selectedNewsTopic === 'ALL') return news;
    return news.filter(
      (item) =>
        item.category === selectedNewsTopic ||
        item.relatedTopic.includes(selectedNewsTopic) ||
        item.title.includes(selectedNewsTopic)
    );
  }, [news, selectedNewsTopic]);

  return (
    <aside aria-label="AIインサイト＆関連ニュース" className="space-y-6">
      {/* Error Alert if Gemini API failed */}
      {insightsError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>AIインサイト・検索グラウンディング取得エラー</span>
          </div>
          <p className="leading-relaxed">{insightsError}</p>
          <button
            type="button"
            onClick={() => onRefreshInsights()}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium transition-colors cursor-pointer"
          >
            再試行する
          </button>
        </div>
      )}

      {/* 1. AI Personal Interest Trend & Summary Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AIインサイト：最近の関心トレンド要約
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onRefreshInsights()}
            disabled={isRefreshingInsights || notes.length === 0}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-xs font-semibold text-slate-950 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshingInsights ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isRefreshingInsights
                ? 'Gemini分析中...'
                : 'AIトレンド＆ニュース分析'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>
            最終解析: {insights.updatedAt} · 対象記録 {notes.length}件
          </span>
          <span>
            {hasFetchedLiveAI
              ? 'Gemini + Google Search 取得済'
              : 'ボタン押下でリアルタイムAI解析'}
          </span>
        </div>

        {isRefreshingInsights ? (
          <div className="space-y-3 py-4">
            <div className="text-xs text-sky-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>
                保存された{notes.length}件のメモをもとに Gemini API (Google Search Grounding) で関心トレンドと最新Webニュースを解析しています...
              </span>
            </div>
            <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-16 w-full rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-20 w-full rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Headline & Overview */}
            <div className="space-y-2 pt-1">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {insights.headline}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {insights.overview}
              </p>
            </div>

            {/* Key Themes Breakdown */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                抽出された主要テーマ（{insights.keyThemes.length}件）
              </div>
              <div className="space-y-2.5">
                {insights.keyThemes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        0{idx + 1}. {theme.topic}
                      </span>
                      <span className="text-sky-400 font-mono tabular-nums shrink-0">
                        {theme.category} · {theme.momentum}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <Compass className="w-3.5 h-3.5" />
                <span>AIからのネクストアクション提案</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {insights.actionSuggestion}
              </p>
            </div>
          </>
        )}

        {/* Dynamic Hot Tags from Notes */}
        {dynamicTopics.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              記録内の注目キーワード（クリックでそのトピックの最新Webニュースを検索）:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dynamicTopics.map(({tag, count}) => (
                <button
                  key={tag}
                  type="button"
                  disabled={isRefreshingInsights}
                  onClick={() => {
                    onSelectTopicFilter(tag);
                    onRefreshInsights(tag);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-500/20 hover:text-sky-300 disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300 transition-colors font-mono tabular-nums cursor-pointer"
                >
                  #{tag} · {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Related Latest Web News Panel (Google Search Grounding) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-sky-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              記録トピックに関連する最新Webニュース
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Google Search Grounding
          </span>
        </div>

        {activeQueryTopic && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            検索対象トピック: <span className="text-slate-800 dark:text-slate-200 font-medium">{activeQueryTopic}</span>
          </div>
        )}

        {/* Category Filter for News */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedNewsTopic('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
              selectedNewsTopic === 'ALL'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-200'
            }`}
          >
            すべて ({news.length})
          </button>
          {CATEGORIES.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                setSelectedNewsTopic(
                  selectedNewsTopic === c.id ? 'ALL' : c.id
                )
              }
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                selectedNewsTopic === c.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Live Google Search Grounding Summary & Web Sources */}
        {groundedSummaryText && (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-sky-400">
              Google検索グラウンディング最新トレンド要約
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {groundedSummaryText}
            </p>
          </div>
        )}

        {/* News Items List */}
        {isRefreshingInsights ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 w-full rounded-lg bg-slate-100 dark:bg-slate-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            該当する分野のニュースがありません。「すべて」を選択するか、「AIトレンド＆ニュース分析」ボタンを押して最新記事を取得してください。
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
              >
                {/* Zero-Pill Metadata line */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="text-sky-400 font-medium">
                    {item.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{item.relatedTopic}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {item.publishedAt}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.summary}
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400 dark:text-slate-500 truncate max-w-[65%]">
                    情報源: {item.sourceName}
                  </span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium shrink-0"
                    >
                      <span>記事を開く</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Grounding Web Source Citations */}
        {groundingLinks.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Google検索グラウンディング参照元リンク ({groundingLinks.length}件):
            </div>
            <div className="flex flex-col gap-1.5">
              {groundingLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1.5 truncate"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{link.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
