export type CategoryId =
  | '仕事'
  | 'アイデア'
  | '買い物'
  | '健康'
  | '学習'
  | '趣味'
  | 'その他';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  enLabel: string;
  colorHex: string;
  textClass: string;
  barClass: string;
  dotColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: '仕事',
    label: '仕事',
    enLabel: 'Work',
    colorHex: '#38BDF8',
    textClass: 'text-sky-400 dark:text-sky-400',
    barClass: 'bg-sky-500',
    dotColor: '#0EA5E9',
  },
  {
    id: 'アイデア',
    label: 'アイデア',
    enLabel: 'Ideas',
    colorHex: '#A78BFA',
    textClass: 'text-violet-400 dark:text-violet-400',
    barClass: 'bg-violet-500',
    dotColor: '#8B5CF6',
  },
  {
    id: '学習',
    label: '学習',
    enLabel: 'Learning',
    colorHex: '#34D399',
    textClass: 'text-emerald-400 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
    dotColor: '#10B981',
  },
  {
    id: '健康',
    label: '健康',
    enLabel: 'Health',
    colorHex: '#F472B6',
    textClass: 'text-pink-400 dark:text-pink-400',
    barClass: 'bg-pink-500',
    dotColor: '#EC4899',
  },
  {
    id: '買い物',
    label: '買い物',
    enLabel: 'Shopping',
    colorHex: '#FBBF24',
    textClass: 'text-amber-400 dark:text-amber-400',
    barClass: 'bg-amber-500',
    dotColor: '#F59E0B',
  },
  {
    id: '趣味',
    label: '趣味',
    enLabel: 'Hobby',
    colorHex: '#FB923C',
    textClass: 'text-orange-400 dark:text-orange-400',
    barClass: 'bg-orange-500',
    dotColor: '#F97316',
  },
  {
    id: 'その他',
    label: 'その他',
    enLabel: 'Other',
    colorHex: '#94A3B8',
    textClass: 'text-slate-400 dark:text-slate-400',
    barClass: 'bg-slate-500',
    dotColor: '#64748B',
  },
];

export interface NoteEntry {
  id: string;
  content: string;
  category: CategoryId;
  tags: string[];
  createdAt: string; // ISO string e.g. 2026-10-16T18:30:00
  yearMonth: string; // YYYY-MM e.g. 2026-10
  dateStr: string; // YYYY-MM-DD e.g. 2026-10-16
  timeStr: string; // HH:mm e.g. 18:30
  aiNote?: string; // Short AI insight / action point
  isPinned?: boolean;
  aiProcessed?: boolean;
}

export interface AIInsightSummary {
  updatedAt: string;
  headline: string;
  overview: string;
  keyThemes: {
    topic: string;
    category: CategoryId;
    momentum: string;
    description: string;
  }[];
  actionSuggestion: string;
}

export interface RelatedNewsItem {
  id: string;
  title: string;
  summary: string;
  relatedTopic: string;
  category: CategoryId;
  sourceName: string;
  publishedAt: string;
  url?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const MAX_NOTE_LENGTH = 3000;

export function getCurrentJSTDateParts(date: Date = new Date()): {
  yearMonth: string;
  dateStr: string;
  timeStr: string;
  fullDateTime: string;
} {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour') === '24' ? '00' : getPart('hour');
  const minute = getPart('minute');

  const yearMonth = `${year}-${month}`;
  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;
  return {
    yearMonth,
    dateStr,
    timeStr,
    fullDateTime: `${dateStr} ${timeStr}`,
  };
}

export function getPreviousYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const prevDate = new Date(y, m - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getRecentYearMonths(baseYearMonth: string, count = 5): string[] {
  const [y, m] = baseYearMonth.split('-').map(Number);
  if (!y || !m) return [baseYearMonth];
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

const VALID_CATEGORY_IDS: CategoryId[] = [
  '仕事', 'アイデア', '買い物', '健康', '学習', '趣味', 'その他'
];

export function sanitizeNoteEntries(raw: unknown): NoteEntry[] {
  if (!Array.isArray(raw)) return [];
  const validEntries: NoteEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const content = typeof obj.content === 'string' ? obj.content.trim() : '';
    if (!content) continue;

    const category: CategoryId = VALID_CATEGORY_IDS.includes(obj.category as CategoryId)
      ? (obj.category as CategoryId)
      : 'その他';

    const tags = Array.isArray(obj.tags)
      ? obj.tags.map((t) => String(t).replace(/^[#＃]/, '').trim()).filter(Boolean).slice(0, 8)
      : ['クイックメモ'];

    const nowParts = getCurrentJSTDateParts();
    const dateStr =
      typeof obj.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.dateStr)
        ? obj.dateStr
        : nowParts.dateStr;
    const yearMonth =
      typeof obj.yearMonth === 'string' && /^\d{4}-\d{2}$/.test(obj.yearMonth)
        ? obj.yearMonth
        : dateStr.slice(0, 7);
    const timeStr =
      typeof obj.timeStr === 'string' && /^\d{2}:\d{2}$/.test(obj.timeStr)
        ? obj.timeStr
        : nowParts.timeStr;

    validEntries.push({
      id: typeof obj.id === 'string' && obj.id ? obj.id : `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: content.slice(0, MAX_NOTE_LENGTH),
      category,
      tags,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
      yearMonth,
      dateStr,
      timeStr,
      aiNote: typeof obj.aiNote === 'string' ? obj.aiNote : undefined,
      isPinned: Boolean(obj.isPinned),
      aiProcessed: Boolean(obj.aiProcessed),
    });
  }
  return validEntries;
}

/**
 * Instant client-side heuristic inference for 0-latency feedback while typing or on instant submit.
 */
export function inferCategoryAndTagsLocal(text: string): {
  category: CategoryId;
  tags: string[];
  aiNote: string;
} {
  const clean = text.trim();
  if (!clean) {
    return {
      category: 'その他',
      tags: [],
      aiNote: '',
    };
  }

  // Extract explicit hashtags if user typed #tag
  const explicitTags = Array.from(clean.matchAll(/[#＃]([^\s#＃、。,.]+)/g)).map(
    (m) => m[1]
  );

  const lower = clean.toLowerCase();

  const rules: {
    category: CategoryId;
    keywords: string[];
    defaultTag: string;
    noteTemplate: string;
  }[] = [
    {
      category: '仕事',
      keywords: [
        '会議',
        'ミーティング',
        'mtg',
        '資料',
        '企画',
        'クライアント',
        '納期',
        'プロジェクト',
        '要件',
        'レビュー',
        '提案',
        'タスク',
        '売上',
        'kpi',
        '仕様',
        'リリース',
        '進捗',
        'メール',
        '日程',
        '採用',
      ],
      defaultTag: '業務推進',
      noteTemplate: 'ネクストアクションと期限を明確化すると効果的です',
    },
    {
      category: 'アイデア',
      keywords: [
        'アイデア',
        '思いつき',
        '発想',
        '企画案',
        'アプリ',
        'サービス',
        'コンセプト',
        '改善案',
        '自動化',
        '新機能',
        'プロトタイプ',
        'ブレスト',
        '仕組み',
        'ひらめき',
        '仮説',
      ],
      defaultTag: '構想メモ',
      noteTemplate: '最小構成のプロトタイプ検証候補としてストック',
    },
    {
      category: '買い物',
      keywords: [
        '買う',
        '購入',
        '注文',
        'amazon',
        '楽天',
        '欲しい',
        '補充',
        'ストック',
        'セール',
        'ガジェット',
        'キーボード',
        'モニター',
        '洗剤',
        'コーヒー豆',
        '予約',
        'スーパー',
        '価格',
        '比較',
      ],
      defaultTag: '購入リスト',
      noteTemplate: '優先度と予算感をチェックして週末リストへ統合',
    },
    {
      category: '健康',
      keywords: [
        '睡眠',
        'ランニング',
        '筋トレ',
        'ジム',
        '体重',
        '食事',
        'ストレッチ',
        '散歩',
        'ウォーキング',
        'タンパク質',
        'プロテイン',
        '疲労',
        '整体',
        '歯科',
        '検診',
        'サウナ',
        '体調',
        'カロリー',
      ],
      defaultTag: 'コンディショニング',
      noteTemplate: '週間ルーティンと睡眠スコアの相関を継続トラッキング',
    },
    {
      category: '学習',
      keywords: [
        '勉強',
        '学習',
        '読書',
        '本',
        '論文',
        'typescript',
        'react',
        'rust',
        'python',
        'ai',
        'llm',
        '英語',
        'toeic',
        '資格',
        '講座',
        'アルゴリズム',
        '設計',
        'アーキテクチャ',
        'ノート',
        '記事',
      ],
      defaultTag: '知識インプット',
      noteTemplate: '週末のアウトプット実践に繋げると定着率が向上します',
    },
    {
      category: '趣味',
      keywords: [
        '映画',
        '音楽',
        'キャンプ',
        '旅行',
        'カメラ',
        '写真',
        'ゲーム',
        'カフェ',
        '美術館',
        '展示',
        'ライブ',
        '料理',
        'レシピ',
        '温泉',
        '登山',
        'ギア',
        'ドラマ',
        'アニメ',
      ],
      defaultTag: 'リフレッシュ',
      noteTemplate: '週末・休日のアクティビティ候補として整理',
    },
  ];

  let bestCategory: CategoryId = 'アイデア';
  let bestScore = 0;
  let matchedKeywords: string[] = [];
  let selectedNote = '思考ログとしてインデックス化完了';

  for (const rule of rules) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        score += 1;
        matchedKeywords.push(kw.toUpperCase() === kw ? kw : kw);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
      selectedNote = rule.noteTemplate;
    }
  }

  // Extract additional smart keywords for tags
  const extractedTags = new Set<string>(explicitTags);
  const topicExtractors: [RegExp, string][] = [
    [/ai|llm|gemini|生成ai|エージェント/i, '生成AI'],
    [/react|next\.?js|typescript|フロントエンド/i, 'フロントエンド'],
    [/英語|リスニング|シャドーイング/i, '英語学習'],
    [/睡眠|リカバリー|昼寝/i, '睡眠改善'],
    [/ランニング|有酸素|ジム|筋トレ/i, 'ワークアウト'],
    [/コーヒー|エスプレッソ|カフェ/i, 'コーヒー'],
    [/キーボード|モニター|デスク|ガジェット/i, 'デスク環境'],
    [/読書|書籍|技術書|論文/i, '読書メモ'],
    [/ui|ux|デザイン|タイポグラフィ/i, 'UI設計'],
    [/会議|クライアント|企画|ロードマップ/i, 'プロジェクト管理'],
  ];

  for (const [regex, tag] of topicExtractors) {
    if (regex.test(clean) && extractedTags.size < 4) {
      extractedTags.add(tag);
    }
  }

  for (const kw of matchedKeywords) {
    if (extractedTags.size < 3 && kw.length >= 2) {
      extractedTags.add(kw);
    }
  }

  if (extractedTags.size === 0) {
    const fallbackRule = rules.find((r) => r.category === bestCategory);
    extractedTags.add(fallbackRule?.defaultTag || 'クイックメモ');
  }

  return {
    category: bestCategory,
    tags: Array.from(extractedTags).slice(0, 4),
    aiNote: selectedNote,
  };
}

export const INITIAL_NOTES: NoteEntry[] = [
  {
    id: 'note-20261016-01',
    content:
      'Q4プロダクト戦略会議の振り返り。AIエージェントによるワークフロー自動化機能の優先度を最上位に引き上げ、来週水曜までにプロトタイプ仕様書を固める。 #AI導入 #ロードマップ',
    category: '仕事',
    tags: ['AI導入', 'ロードマップ', '生成AI', 'プロジェクト管理'],
    createdAt: '2026-10-16T18:20:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-16',
    timeStr: '18:20',
    aiNote: '来週水曜の仕様書レビューに向けたマイルストーン設定を推奨',
    isPinned: true,
    aiProcessed: true,
  },
  {
    id: 'note-20261016-02',
    content:
      '音声メモから「感情の揺らぎ」と「集中度」を時間帯別に可視化するパーソナル・バイオリズムログのアイデア。入力負荷ゼロで振り返れるUIが鍵になりそう。',
    category: 'アイデア',
    tags: ['構想メモ', 'UI設計', '生成AI'],
    createdAt: '2026-10-16T12:45:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-16',
    timeStr: '12:45',
    aiNote: '最小構成のプロトタイプ検証候補としてストック',
    isPinned: true,
    aiProcessed: true,
  },
  {
    id: 'note-20261015-01',
    content:
      '『Designing Data-Intensive Applications』第7章のトランザクション分離レベルを再読。直列化可能性とスナップショット分離のトレードオフを自分の設計ノートに図解する。',
    category: '学習',
    tags: ['読書メモ', '分散システム', '知識インプット'],
    createdAt: '2026-10-15T22:10:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-15',
    timeStr: '22:10',
    aiNote: '週末のアウトプット実践に繋げると定着率が向上します',
    aiProcessed: true,
  },
  {
    id: 'note-20261014-01',
    content:
      '夜間作業時のブルーライト軽減とデスク手元照明のため、BenQ ScreenBar Halo 2とエチオピア産浅煎りコーヒー豆（200g）を週末に注文する。',
    category: '買い物',
    tags: ['デスク環境', 'コーヒー', '購入リスト'],
    createdAt: '2026-10-14T20:05:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-14',
    timeStr: '20:05',
    aiNote: '優先度と予算感をチェックして週末リストへ統合',
    aiProcessed: true,
  },
  {
    id: 'note-20261012-01',
    content:
      '皇居外周5kmイージーラン完了（キロ5分15秒ペース）。就寝90分前の入浴＋マグネシウム補給に変えてから深睡眠スコアが平均22%改善している。',
    category: '健康',
    tags: ['ワークアウト', '睡眠改善', 'コンディショニング'],
    createdAt: '2026-10-12T07:40:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-12',
    timeStr: '07:40',
    aiNote: '週間ルーティンと睡眠スコアの相関を継続トラッキング',
    aiProcessed: true,
  },
  {
    id: 'note-20261010-01',
    content:
      '東京都現代美術館の秋の建築・空間デザイン企画展を訪問。自然光とコンクリート壁面のコントラストが美しく、ミニマルUIの余白設計にも通じる発見があった。',
    category: '趣味',
    tags: ['美術館', 'UI設計', '写真'],
    createdAt: '2026-10-10T15:30:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-10',
    timeStr: '15:30',
    aiNote: '視覚デザインのインスピレーションノートと接続可能',
    aiProcessed: true,
  },
  {
    id: 'note-20261006-01',
    content:
      'Next.js 15 App RouterとServer Actionsを用いたマルチモーダル検索パイプラインのベンチマーク検証。レスポンスキャッシュ戦略でTTFBを180ms短縮できた。',
    category: '学習',
    tags: ['フロントエンド', '生成AI', 'パフォーマンス'],
    createdAt: '2026-10-06T19:15:00',
    yearMonth: '2026-10',
    dateStr: '2026-10-06',
    timeStr: '19:15',
    aiNote: '実務のQ4アーキテクチャ設計へ知見を還元できます',
    aiProcessed: true,
  },
  {
    id: 'note-20260928-01',
    content:
      'クライアント向けデザインシステム刷新提案。ダークモードでのコントラスト比（WCAG AA準拠）とTabular Numeralsによる数値テーブルの視認性向上を高く評価いただいた。',
    category: '仕事',
    tags: ['UI設計', 'デザインシステム', '業務推進'],
    createdAt: '2026-09-28T16:50:00',
    yearMonth: '2026-09',
    dateStr: '2026-09-28',
    timeStr: '16:50',
    aiNote: '社内標準テンプレート化への展開が有効です',
    aiProcessed: true,
  },
  {
    id: 'note-20260921-01',
    content:
      '日々の断片的なメモから「1ヶ月後の自分が読むべき3つの問い」を自動生成してくれるリフレクション機能の構想。単なる要約より思考が深まるはず。',
    category: 'アイデア',
    tags: ['構想メモ', '生成AI', 'ナレッジ管理'],
    createdAt: '2026-09-21T23:00:00',
    yearMonth: '2026-09',
    dateStr: '2026-09-21',
    timeStr: '23:00',
    aiNote: 'パーソナルAIツール群の中核機能として高ポテンシャル',
    aiProcessed: true,
  },
  {
    id: 'note-20260914-01',
    content:
      'スタンディングデスク用の疲労軽減マットと、静電容量無接点方式のコンパクト英語配列キーボードを比較検討中。打鍵感と手首の角度が決め手。',
    category: '買い物',
    tags: ['デスク環境', 'ガジェット', '購入リスト'],
    createdAt: '2026-09-14T14:20:00',
    yearMonth: '2026-09',
    dateStr: '2026-09-14',
    timeStr: '14:20',
    aiNote: 'エルゴノミクス投資として優先度高',
    aiProcessed: true,
  },
  {
    id: 'note-20260905-01',
    content:
      '朝の20分モビリティストレッチと肩甲骨まわりの可動域トレーニングを継続2週間。夕方の首・肩の重だるさが劇的に減った。',
    category: '健康',
    tags: ['コンディショニング', 'ワークアウト'],
    createdAt: '2026-09-05T08:10:00',
    yearMonth: '2026-09',
    dateStr: '2026-09-05',
    timeStr: '08:10',
    aiNote: 'デスクワーク生産性を支える基礎習慣として定着',
    aiProcessed: true,
  },
  {
    id: 'note-20260824-01',
    content:
      '軽井沢での週末ワーケーション＆森林トレイルウォーク。朝の澄んだ空気の中で書いた四半期構想ドキュメントが一番筆が進んだ。',
    category: '趣味',
    tags: ['旅行', 'リフレッシュ', '構想メモ'],
    createdAt: '2026-08-24T11:00:00',
    yearMonth: '2026-08',
    dateStr: '2026-08-24',
    timeStr: '11:00',
    aiNote: '環境変化による発想力ブーストの好事例',
    aiProcessed: true,
  },
  {
    id: 'note-20260811-01',
    content:
      '英語の技術ポッドキャスト（Latent Space / Software Engineering Daily）を毎朝1.2倍速でシャドーイング。AIエージェント設計に関する専門語彙が自然に聞き取れるようになってきた。',
    category: '学習',
    tags: ['英語学習', '生成AI', '知識インプット'],
    createdAt: '2026-08-11T08:30:00',
    yearMonth: '2026-08',
    dateStr: '2026-08-11',
    timeStr: '08:30',
    aiNote: '技術トレンド把握と語学習得の一石二鳥ルーティン',
    aiProcessed: true,
  },
  {
    id: 'note-20260719-01',
    content:
      '下期のチーム開発体制見直し。ドキュメント駆動開発（RFC文化）を導入し、非同期レビューで意思決定の透明性とスピードを両立させる。',
    category: '仕事',
    tags: ['プロジェクト管理', '業務推進', 'チーム設計'],
    createdAt: '2026-07-19T17:45:00',
    yearMonth: '2026-07',
    dateStr: '2026-07-19',
    timeStr: '17:45',
    aiNote: '会議時間削減とナレッジ蓄積に直結',
    aiProcessed: true,
  },
];

export const INITIAL_INSIGHTS: AIInsightSummary = {
  updatedAt: '2026-10-16 21:45',
  headline: '「生成AIワークフロー実装」と「高密度UI・知的生産環境の最適化」に強い関心集中',
  overview:
    '直近の記録からは、業務におけるAIエージェント導入・Next.jsによる高速アーキテクチャ検証と、自身のパーソナルナレッジ活用（音声・思考整理UI）が相互にリンクしています。また、深睡眠改善やランニング・デスク環境整備など、知的生産の持続性を支えるフィジカル面への投資もバランス良く推移しています。',
  keyThemes: [
    {
      topic: 'AIエージェント＆次世代UI設計',
      category: '仕事',
      momentum: '急上昇 (+42%)',
      description:
        'Q4プロダクト戦略でのAI自動化推進と、個人の思考・バイオリズム可視化アイデアが共通テーマとして浮上しています。',
    },
    {
      topic: '分散システム・Web高速化技術',
      category: '学習',
      momentum: '安定継続',
      description:
        'トランザクション分離理論の体系的読書とNext.js 15のキャッシュ最適化など、基礎理論と実装の両輪で学習が進んでいます。',
    },
    {
      topic: '睡眠品質＆エルゴノミクス習慣',
      category: '健康',
      momentum: '好調維持',
      description:
        '皇居ラン・入浴習慣による深睡眠スコア+22%改善と、デスク照明・キーボード環境への投資が好循環を生んでいます。',
    },
  ],
  actionSuggestion:
    '「仕事（AIワークフロー仕様書）」と「アイデア（思考リフレクションUI）」のノートを統合し、週末に15分だけプロトタイプの画面構成スケッチを作ると、公私両面の知見がシナジーを発揮します。',
};

export const INITIAL_NEWS: RelatedNewsItem[] = [
  {
    id: 'news-1',
    title: '自律型AIエージェントの業務ワークフロー統合が2026年後半の企業システム標準へ',
    summary:
      '単なるチャット応答を超え、タスク分解・仕様策定・進捗管理を自律的に補助するマルチステップAIワークフローの導入事例が急増しています。',
    relatedTopic: '生成AI / ロードマップ',
    category: '仕事',
    sourceName: 'Tech Architecture Review',
    publishedAt: '2026-10-16',
    url: 'https://cloud.google.com/ai',
  },
  {
    id: 'news-2',
    title: 'React 19 & Next.js 15におけるStreaming SSRとキャッシュ制御のベストプラクティス',
    summary:
      'Server Actionsと部分プリレンダリングを組み合わせることで、データ集約型ダッシュボードのTTFBを大幅に短縮する設計パターンが注目されています。',
    relatedTopic: 'フロントエンド / UI設計',
    category: '学習',
    sourceName: 'Modern Web Engineering',
    publishedAt: '2026-10-15',
    url: 'https://nextjs.org/blog',
  },
  {
    id: 'news-3',
    title: '深部体温リズムと有酸素運動がもたらす「深睡眠スコア」改善の最新睡眠科学',
    summary:
      '就寝90分前の入浴による深部体温勾配の形成と、イージーペースの有酸素運動が翌日の認知パフォーマンスと集中持続時間を高めることが報告されました。',
    relatedTopic: '睡眠改善 / ワークアウト',
    category: '健康',
    sourceName: 'Performance & Longevity Journal',
    publishedAt: '2026-10-14',
    url: 'https://pubmed.ncbi.nlm.nih.gov/',
  },
  {
    id: 'news-4',
    title: 'デジタルクリエイターのための「目の疲労を防ぐ」デスク環境・間接照明ガイド',
    summary:
      'モニター上部からの非対称光学ライトバーと環境光センサーの活用により、夜間のVDT作業における眼精疲労を軽減する手法が解説されています。',
    relatedTopic: 'デスク環境 / ガジェット',
    category: '買い物',
    sourceName: 'Workspace Design Digest',
    publishedAt: '2026-10-13',
    url: 'https://www.benq.com/',
  },
];
