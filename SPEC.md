# ChronoNote（クロノノート）— プロジェクト仕様書 (`SPEC.md`)

本ドキュメントは、AIエージェント（Antigravity等）および開発者がプロジェクトの全体像・アーキテクチャ・データ構造・API仕様を即座に把握し、シームレスに機能拡張を行えるようにするための技術仕様書です。

---

## 1. アプリの概要と主な機能一覧

### アプリ概要
**ChronoNote（クロノノート）** は、思いついたことや情報を忘れないうちに1秒でサッと記録し、AI（Gemini API + Google Search Grounding）が自動で分類・構造化・関心トレンド分析・関連ニュース収集を行う **「パーソナル記録＆トレンド分析Webアプリ」** です。

- **フレームワーク**: Next.js 15 (App Router) + React 19 + TypeScript
- **スタイリング**: Tailwind CSS v4 + Lucide Icons (`lucide-react`)
- **AI SDK**: `@google/genai` (サーバーサイド API Routes 経由で呼び出し)

### 主な機能一覧
1. **クイック記録＆AI自動分類 (`QuickCaptureBar`)**
   - テキスト入力と同時に現在日時（`YYYY-MM-DD HH:mm` / `YYYY-MM`）を自動付与。
   - **ハイブリッドAI推論**:
     - 入力中はクライアントサイドのヒューリスティック推論 (`inferCategoryAndTagsLocal`) により遅延ゼロ（0ms）で分野カテゴリ（`仕事` / `アイデア` / `学習` / `健康` / `買い物` / `趣味` / `その他`）とタグ（`#タグ`）をリアルタイム推測。
     - 保存時にバックグラウンドで `/api/gemini/classify` を呼び出し、Gemini による高精度な分野判定・タグ補完・1行AIインサイトコメント（`aiNote`）を自動付与。
   - **リアルタイム音声入力（Web Speech API）**:
     - `SpeechRecognition` / `webkitSpeechRecognition`（`lang = 'ja-JP'`, `continuous = true`, `interimResults = true`）を用いた音声文字起こし入力に対応。
   - キーボードショートカット（`⌘K` / `Ctrl+K` でフォーカス、`⌘+Enter` / `Ctrl+Enter` で即座に保存）対応。

2. **統計ダッシュボード (`AnalyticsDashboard`)**
   - KPIサマリー表示（総ストック記録数、今月の記録数、最多フォーカス分野、AI抽出トピックタグ数）。
   - **分野別（カテゴリ）記録分布グラフ**: 各分野の件数・占有率を横棒グラフで可視化し、行クリックで該当分野のフィルタリングが可能。
   - **月別記録推移グラフ**: 年月（`YYYY-MM`）ごとの記録件数を縦棒グラフで表示し、バーをクリックすると該当月でフィルタリングが可能。

3. **フィルタリング＆集約ビュー (`RecordsTimelineAndCalendar`)**
   - **複合フィルタリング**: 分野別フィルタ、年月別プルダウン、キーワード・タグ横断検索（リアルタイム絞り込み）、頻出タグのワンクリック絞り込み。
   - **表示モード切替**:
     - **タイムライン表示**: 年月ごとにグルーピングされたカードリスト表示。
     - **月間カレンダー表示**: 月別のカレンダーグリッドに日ごとの記録件数・プレビューを表示し、日付クリックでその日のメモを絞り込み可能。
   - **インライン操作**: 各メモのピン留め（上部固定）、インライン編集（本文・分野変更）、削除に対応。

4. **AIインサイト＆関連Webニュース (`AIInsightsAndNewsPanel`)**
   - ヘッダーの「AIインサイト」タブを開いた際、またはパネル内の「AIトレンド＆ニュース分析」ボタン（および注目キーワードタグ）を押した際に `/api/gemini/insights` を呼び出し。
   - **関心トレンド要約**: 現在保存されているメモ一覧をもとに、全体ヘッドライン・傾向要約・主要3テーマ（モメンタム付き）・具体的なネクストアクション提案を生成。
   - **関連最新Webニュース（Google Search Grounding）**: メモの頻出タグや注目トピックをもとに Google 検索グラウンディングを実行し、最新トレンド解説・ニュース記事一覧・参照元Webリンク（`groundingChunks`）を表示。

5. **データ管理＆UIテーマ**
   - **LocalStorage 永続化**: メモ一覧、AIインサイト結果、取得ニュース、テーマ設定をブラウザの `localStorage` に自動保存。
   - **エクスポート／インポート**:
     - **JSON エクスポート / インポート**: バックアップおよび復元用。
     - **CSV エクスポート**: UTF-8 BOM (`\uFEFF`) 付きで出力し、Excel（Windows/Mac）で日本語が文字化けしない仕様。
   - **ダーク／ライトモード切替**: Tailwind の `dark` クラス制御によるテーマ切り替え（デフォルトはダークモード）。

---

## 2. ディレクトリ・ファイル構成と各ファイルの役割

```text
/
├── .env.example                           # 環境変数テンプレート (GEMINI_API_KEY, APP_URL)
├── SPEC.md                                # 本仕様書ファイル
├── metadata.json                          # AI Studio アプレットメタデータ・権限設定 (microphone 等)
├── next.config.ts                         # Next.js 設定ファイル
├── package.json                           # 依存パッケージとスクリプト定義
├── tsconfig.json                          # TypeScript 設定
├── app/
│   ├── globals.css                        # Tailwind CSS v4 グローバルスタイル設定
│   ├── layout.tsx                         # ルートレイアウト (Google Fonts: Plus Jakarta Sans, Noto Sans JP, JetBrains Mono 設定)
│   ├── page.tsx                           # メイン画面コンテナ (状態管理、LocalStorage同期、エクスポート処理、各コンポーネント統合)
│   └── api/
│       └── gemini/
│           ├── classify/
│           │   └── route.ts               # [POST] 新規メモのAI分野判定・タグ抽出・1行インサイト生成API
│           └── insights/
│               └── route.ts               # [POST] 蓄積メモからの関心トレンド分析＆Google検索グラウンディング最新ニュース取得API
├── components/
│   ├── QuickCaptureBar.tsx                # クイック記録エリア（リアルタイム推論プレビュー＋Web Speech API 音声入力）
│   ├── AnalyticsDashboard.tsx             # KPIカード＋分野別分布グラフ＋月別推移グラフ
│   ├── RecordsTimelineAndCalendar.tsx     # 検索・フィルタバー＋タイムライン一覧＋月間カレンダービュー＋インライン編集
│   └── AIInsightsAndNewsPanel.tsx         # AI関心トレンド要約＋Google Search Grounding 最新ニュース・参照リンク表示
└── lib/
    ├── chrononote-data.ts                 # データ型定義、カテゴリ定数、ローカル即時推論関数、初期サンプルデータ
    └── utils.ts                           # クラス名結合ユーティリティ (cn)
```

---

## 3. データの構造（型定義・LocalStorage キー名）

### 3.1 コア型定義 (`lib/chrononote-data.ts`)

#### 分野カテゴリ (`CategoryId`)
```ts
export type CategoryId =
  | '仕事'
  | 'アイデア'
  | '買い物'
  | '健康'
  | '学習'
  | '趣味'
  | 'その他';
```

#### メモエントリ (`NoteEntry`)
```ts
export interface NoteEntry {
  id: string;           // 一意のID (例: "note-1760677200000")
  content: string;      // メモ本文
  category: CategoryId; // 分野カテゴリ
  tags: string[];       // 抽出または手動追加されたタグ配列 ('#'記号なし)
  createdAt: string;    // ISO 8601 登録日時 (例: "2026-10-16T18:20:00.000Z")
  yearMonth: string;    // 年月インデックス (例: "2026-10")
  dateStr: string;      // 日付文字列 (例: "2026-10-16")
  timeStr: string;      // 時刻文字列 (例: "18:20")
  aiNote?: string;      // AIによる1行インサイト・次の一手メモ
  isPinned?: boolean;   // ピン留め状態
  aiProcessed?: boolean;// Gemini API によるバックグラウンド解析完了フラグ
}
```

#### AIインサイト要約 (`AIInsightSummary`)
```ts
export interface AIInsightSummary {
  updatedAt: string; // 最終解析日時 (例: "2026-10-16 22:10")
  headline: string;  // 関心トレンドを象徴する1行ヘッドライン
  overview: string;  // 全体傾向と分野間のシナジー要約
  keyThemes: {
    topic: string;       // 注目テーマ名
    category: CategoryId;// 関連分野
    momentum: string;    // 勢い・ステータス (例: "急上昇", "継続注力")
    description: string; // テーマの詳細解説
  }[];
  actionSuggestion: string; // AIからのネクストアクション提案
}
```

#### 関連ニュース項目 (`RelatedNewsItem`)
```ts
export interface RelatedNewsItem {
  id: string;
  title: string;        // ニュース記事タイトル
  summary: string;      // 記事要約とユーザー関心トピックとの関連性
  relatedTopic: string; // 関連タグ・トピック名
  category: CategoryId; // 関連分野
  sourceName: string;   // メディア名・情報源名
  publishedAt: string;  // 公開日・取得日 (YYYY-MM-DD)
  url?: string;         // 記事URL (Google Search Grounding 等から抽出)
}
```

### 3.2 LocalStorage キー名 (`app/page.tsx`)

| キー名 | 保存データの型 | 用途 |
| :--- | :--- | :--- |
| `chrononote_entries_v1` | `NoteEntry[]` | ユーザーが記録・編集した全メモデータ |
| `chrononote_insights_v1` | `AIInsightSummary` | 直近に生成されたAI関心トレンド要約データ |
| `chrononote_news_v1` | `RelatedNewsItem[]` | 直近に取得された関連Webニュース一覧 |
| `chrononote_theme_v1` | `'dark' \| 'light'` | UIカラーテーマ設定（デフォルト: `'dark'`） |

---

## 4. Gemini API の呼び出し仕様

すべての Gemini API 呼び出しは `@google/genai` SDK を使用し、**サーバーサイド（Next.js Route Handlers）** で実行されます。クライアント側に API キーは一切露出させません。

### 4.1 環境変数
- **変数名**: `GEMINI_API_KEY`
- **設定場所**: ローカル開発時はプロジェクトルートの `.env.local`（または `.env`）に記述します。
  ```env
  GEMINI_API_KEY="AIzaSy..."
  ```

### 4.2 クライアント初期化パターン
```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});
```

### 4.3 エンドポイント仕様

#### ① `POST /api/gemini/classify` (`app/api/gemini/classify/route.ts`)
- **役割**: 新規記録されたメモ本文から分野・タグ・1行AIコメントを推論。
- **使用モデル**: `gemini-3.8-flash`
- **設定**: `responseMimeType: 'application/json'`, `responseSchema` による構造化JSON出力（`category`, `tags`, `aiNote`）。
- **フォールバック**: `GEMINI_API_KEY` 未設定時や通信エラー時は、`inferCategoryAndTagsLocal(text)` の推論結果を返し、UXをブロックしない設計。

#### ② `POST /api/gemini/insights` (`app/api/gemini/insights/route.ts`)
- **役割**: 保存されているメモ一覧（最大直近25件）とフォーカスキーワードを受け取り、「関心トレンド要約」と「関連する最新Webニュース」を並列取得。
- **使用モデル**: `gemini-3.8-flash`
- **処理構成（`Promise.all` による2並列呼び出し）**:
  1. **トレンド要約生成**:
     - `responseMimeType: 'application/json'` + `responseSchema` を指定し、`headline`, `overview`, `keyThemes`, `actionSuggestion` を構造化抽出。
  2. **最新Webニュース取得（Google Search Grounding 有効）**:
     - `config: { tools: [{ googleSearch: {} }] }` を有効化。
     - ユーザーの頻出タグ・注目トピックに関連する最新Webニュース4件とトレンド要約を検索・生成。
     - `newsRes.candidates?.[0]?.groundingMetadata?.groundingChunks` から実際のWeb参照元URL（`chunk.web.uri`, `chunk.web.title`）を抽出し、ニュース項目および参照リンク一覧（`groundingLinks`）としてフロントエンドへ返却。

---

## 5. 今後の拡張タスク（ローカル開発ロードマップ）

VS Code（Antigravity）でのローカル開発に移行後、以下のステップで機能を段階的に拡張できます。

### Phase 1: 外部データベース＆認証連携（マルチデバイス同期）
- **現状**: `localStorage` によるブラウザ単体保存。
- **拡張案**:
  - **Firebase (Firestore + Firebase Auth)** または **Supabase / Cloud SQL (PostgreSQL + Drizzle ORM)** を導入。
  - `NoteEntry` の CRUD 操作を DB 永続化し、PC とスマートフォンの間でリアルタイム同期を実現。
  - 既存の JSON エクスポート／インポート機能を利用して、ローカルデータを初期マイグレーション可能。

### Phase 2: PWA（Progressive Web App）化＆オフライン対応強化
- **拡張案**:
  - `app/manifest.ts`（または `public/manifest.json`）とアプリアイコンを追加し、スマートフォンやデスクトップのホーム画面へインストール可能にする。
  - Service Worker を構成し、オフライン時は `IndexedDB` / `localStorage` キューにメモを保存し、オンライン復帰時に `/api/gemini/classify` およびクラウドDBへ自動同期する仕組みを追加。
  - モバイルの「共有シート（Web Share Target API）」に対応し、他アプリやブラウザで見ていた記事URLを1タップで ChronoNote に記録可能にする。

### Phase 3: ベクトル検索（セマンティック検索）と月次AIレポート
- **拡張案**:
  - `@google/genai` の `gemini-embedding-2-preview` (`ai.models.embedContent`) を活用し、各メモ保存時に Embedding ベクトルを生成。
  - キーワードが完全一致しなくても「意味的に近い過去のメモ」を瞬時に引き出すセマンティック検索や、「1年前の今日・関連する過去のアイデア」を自動リマインドするセレンディピティ機能を実装。
  - 月末にその月の全記録を振り返る「月次AIリフレクションレポート」の自動生成・Markdown出力機能を追加。

### Phase 4: 音声入力・マルチモーダル記録の高度化
- **現状**: Web Speech API によるブラウザ音声認識。
- **拡張案**:
  - `MediaRecorder` で録音した音声データをサーバーへ送り、`gemini-3.5-transcribe` で高精度文字起こし＋話者・感情トーン分析を実行。
  - ホワイトボードの写真や書籍のページ画像を添付・撮影してそのままメモ化できるマルチモーダル入力対応。
