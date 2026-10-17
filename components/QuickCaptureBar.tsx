'use client';

import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {
  Send,
  Sparkles,
  Tag,
  Clock,
  CornerDownLeft,
  RotateCcw,
  Mic,
  Square,
  AlertCircle,
} from 'lucide-react';
import {
  CATEGORIES,
  CategoryId,
  inferCategoryAndTagsLocal,
} from '@/lib/chrononote-data';

// Type declarations for Web Speech API
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface QuickCaptureBarProps {
  onAddNote: (payload: {
    content: string;
    category: CategoryId;
    tags: string[];
    aiNote: string;
    manualCategoryOverride: boolean;
  }) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isAiClassifying: boolean;
}

const SAMPLE_PROMPTS = [
  '来週のクライアント提案資料にAIワークフロー自動化のROI試算スライドを追加する #企画',
  '睡眠の質を上げるため、22時以降はスマホを別室に置いて読書30分を習慣化するアイデア',
  'TypeScript 5.9の型推論最適化とReact 19 Server Actionsの設計パターンを週末に検証する',
  'デスク用の間接照明ライトバーと深煎りカフェインレスコーヒー豆をAmazonで注文する',
];

export default function QuickCaptureBar({
  onAddNote,
  inputRef,
  isAiClassifying,
}: QuickCaptureBarProps) {
  const [content, setContent] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const [manualCategory, setManualCategory] = useState<CategoryId | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [currentTimeStr, setCurrentTimeStr] = useState('2026-10-16 22:06');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCurrentTimeStr(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
          now.getHours()
        )}:${pad(now.getMinutes())}`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // Check Web Speech API support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      if (!win.SpeechRecognition && !win.webkitSpeechRecognition) {
        setIsSpeechSupported(false);
      }
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleVoiceInput = () => {
    setSpeechError(null);

    if (isListening) {
      stopListening();
      return;
    }

    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
      setSpeechError(
        'お使いのブラウザは音声入力（Web Speech API）に対応していません。ChromeまたはEdge等でお試しください。'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk) {
          setContent((prev) => {
            const needsSpace =
              prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') && !prev.endsWith('。');
            return prev + (needsSpace ? ' ' : '') + finalChunk;
          });
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          setSpeechError(
            'マイクの使用が許可されていません。ブラウザのアドレスバーからマイク権限を許可してください。'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError('音声が検出されませんでした。もう一度マイクボタンを押してお話しください。');
        } else if (event.error !== 'aborted') {
          setSpeechError(`音声認識エラーが発生しました (${event.error})`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err);
      setSpeechError('音声認識の開始に失敗しました。');
      setIsListening(false);
    }
  };

  // Combine finalized content + live interim transcript for real-time AI inference
  const combinedText = useMemo(() => {
    if (!interimTranscript) return content;
    return `${content}${content ? ' ' : ''}${interimTranscript}`;
  }, [content, interimTranscript]);

  const inferred = useMemo(() => {
    return inferCategoryAndTagsLocal(combinedText);
  }, [combinedText]);

  const activeCategory: CategoryId = manualCategory ?? inferred.category;
  const mergedTags = useMemo(() => {
    const set = new Set<string>([...inferred.tags, ...extraTags]);
    return Array.from(set).slice(0, 6);
  }, [inferred.tags, extraTags]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalContentToSave = combinedText.trim();
    if (!finalContentToSave) return;

    if (isListening) {
      stopListening();
    }

    onAddNote({
      content: finalContentToSave,
      category: activeCategory,
      tags: mergedTags.length > 0 ? mergedTags : ['クイックメモ'],
      aiNote: inferred.aiNote,
      manualCategoryOverride: manualCategory !== null,
    });

    setContent('');
    setInterimTranscript('');
    setManualCategory(null);
    setExtraTags([]);
    setCustomTagInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const cleanTag = customTagInput.trim().replace(/^[#＃]/, '');
      if (cleanTag && !extraTags.includes(cleanTag)) {
        setExtraTags((prev) => [...prev, cleanTag]);
      }
      setCustomTagInput('');
    }
  };

  return (
    <section
      aria-label="クイック記録入力"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            クイック記録＆AI自動分類
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            {currentTimeStr} 自動付与
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">サンプル入力を試す:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['仕事', 'アイデア', '学習', '買い物'].map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setContent(SAMPLE_PROMPTS[idx]);
                  setManualCategory(null);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {label}例
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Speech Error Message */}
      {speechError && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder={
              isListening
                ? 'マイクに向かってお話しください... リアルタイムで文字起こしされます'
                : '思いついたアイデア、仕事のタスク、学んだこと、買いたいものを1秒でメモ...（マイク音声入力・#タグ自動抽出・⌘+Enterで即保存）'
            }
            className={`w-full rounded-lg border px-4 py-3 pr-28 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all resize-none leading-relaxed ${
              isListening
                ? 'border-rose-500/70 bg-rose-500/5 focus:ring-rose-500/50 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 focus:ring-sky-500/60 focus:border-sky-500'
            }`}
          />

          {/* Voice Input Mic Button positioned inside textarea top-right */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={!isSpeechSupported}
              title={
                !isSpeechSupported
                  ? 'このブラウザはWeb Speech APIに対応していません'
                  : isListening
                  ? '音声入力を停止'
                  : 'マイクで音声入力を開始 (日本語)'
              }
              aria-label={isListening ? '音声入力を停止' : '音声入力を開始'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {isListening ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>音声入力</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Interim Voice Transcript Banner */}
        {(isListening || interimTranscript) && (
          <div className="mt-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 min-w-0">
              <Mic className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-medium text-rose-400 shrink-0">
                音声認識中:
              </span>
              <span className="truncate text-slate-600 dark:text-slate-300">
                {interimTranscript || '発話を待機しています... そのままお話しください'}
              </span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-rose-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              完了
            </button>
          </div>
        )}

        {/* Live AI Category & Tag Inference Preview Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>AI推測カテゴリ:</span>
            </div>

            {/* Interactive Category Selector Buttons */}
            <div
              role="group"
              aria-label="分野の選択"
              className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 overflow-x-auto"
            >
              {CATEGORIES.map((cat) => {
                const isSelected =
                  combinedText.trim().length > 0 || manualCategory !== null
                    ? activeCategory === cat.id
                    : false;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setManualCategory(
                        manualCategory === cat.id ? null : cat.id
                      )
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {manualCategory && (
              <button
                type="button"
                onClick={() => setManualCategory(null)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="AI自動推測に戻す"
              >
                <RotateCcw className="w-3 h-3" />
                自動推測に戻す
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            {/* Inferred Tags Unboxed Metadata + Optional Custom Tag Input */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {combinedText.trim() || extraTags.length > 0 ? (
                <span className="text-slate-700 dark:text-slate-300">
                  {mergedTags.map((t) => `#${t}`).join(' · ')}
                </span>
              ) : (
                <span>入力すると関連タグを自動抽出します</span>
              )}
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="+タグ追加(Enter)"
                aria-label="カスタムタグを追加"
                className="w-28 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Primary Submit Action */}
            <button
              type="submit"
              disabled={!combinedText.trim()}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAiClassifying ? 'AI解析・記録中...' : '記録する'}</span>
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] opacity-75 font-mono">
                <CornerDownLeft className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
