import {GoogleGenAI, Type} from '@google/genai';
import {NextRequest, NextResponse} from 'next/server';
import {
  NoteEntry,
  CategoryId,
  RelatedNewsItem,
  AIInsightSummary,
  DEFAULT_GEMINI_MODEL,
  getCurrentJSTDateParts,
} from '@/lib/chrononote-data';

const VALID_CATEGORIES: CategoryId[] = [
  '仕事',
  'アイデア',
  '買い物',
  '健康',
  '学習',
  '趣味',
  'その他',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notes: NoteEntry[] = Array.isArray(body?.notes) ? body.notes : [];
    const focusTopic: string =
      typeof body?.focusTopic === 'string' ? body.focusTopic.trim() : '';

    if (notes.length === 0) {
      return NextResponse.json(
        {error: '分析対象のメモがありません。まずはメモを記録してください。'},
        {status: 400}
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY が設定されていません。Settings > Secrets パネルで API キーを確認してください。',
        },
        {status: 500}
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    const recentNotesSample = notes
      .slice(0, 25)
      .map(
        (n, idx) =>
          `${idx + 1}. [${n.dateStr} ${n.timeStr} | 分野:${n.category} | タグ:${n.tags.join(
            ','
          )}] ${n.content}`
      )
      .join('\n');

    // Extract top tags & categories from the user's saved notes
    const tagCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    for (const n of notes) {
      categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
      for (const t of n.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    const queryTopic =
      focusTopic ||
      (topTags.length > 0 ? topTags.join('、') : topCategories.join('、'));

    // 1. Call Gemini for Personal Interest Trend Analysis (Structured JSON)
    const insightsPromise = ai.models.generateContent({
      model: modelName,
      contents: `以下はユーザーが実際に記録・保存しているパーソナルメモの一覧（最新順）です。
${focusTopic ? `特に「${focusTopic}」に関する関心も含めて、` : ''}現在保存されているメモの内容・日付・タグ・分野の傾向を深く分析し、ユーザーの「最近の関心トレンド要約」「主要3テーマ」「具体的なネクストアクション提案」をJSON形式で出力してください。

【保存されているメモ一覧】
${recentNotesSample}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description:
                'ユーザーの最近の関心トレンドを端的に表す1行ヘッドライン（45文字以内）',
            },
            overview: {
              type: Type.STRING,
              description:
                '蓄積されたメモから読み取れる関心トレンドの要約と分野間のつながり（140〜200文字程度）',
            },
            keyThemes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: {
                    type: Type.STRING,
                    description: '注目テーマ名（20文字以内）',
                  },
                  category: {
                    type: Type.STRING,
                    description:
                      '仕事、アイデア、買い物、健康、学習、趣味、その他 のいずれか1つ',
                  },
                  momentum: {
                    type: Type.STRING,
                    description: '例: 急上昇・最重要・継続注力・新規関心 など',
                  },
                  description: {
                    type: Type.STRING,
                    description:
                      'メモの具体的内容に基づく傾向と背景の解説（60〜90文字程度）',
                  },
                },
                required: ['topic', 'category', 'momentum', 'description'],
              },
            },
            actionSuggestion: {
              type: Type.STRING,
              description:
                'ユーザーのメモ内容から導き出される具体的で実行しやすい次の一手（80〜120文字程度）',
            },
          },
          required: ['headline', 'overview', 'keyThemes', 'actionSuggestion'],
        },
      },
    });

    // 2. Call Gemini with Google Search Grounding for Real Web News related to the user's notes
    const groundedNewsPromise = ai.models.generateContent({
      model: modelName,
      contents: `ユーザーの保存メモから抽出された関心トピック「${queryTopic}」および以下のメモ内容に関連する最新のWebニュース・技術動向・トレンド記事をGoogle検索で調べ、実際の最新ニュース4件と全体要約を日本語で出力してください。

【ユーザーの最近のメモ抜粋】
${notes
  .slice(0, 8)
  .map((n) => `- (${n.category}) ${n.content}`)
  .join('\n')}

以下のJSONフォーマットのみで出力してください（マークダウンのコードブロック記号は不要、純粋なJSONオブジェクトのみ）:
{
  "groundedSummary": "検索結果に基づく最新トレンド動向の要約（120〜180文字）",
  "newsItems": [
    {
      "title": "ニュース記事の具体的なタイトル",
      "summary": "ニュースの内容とユーザーの関心トピックとの関連ポイント（80〜110文字）",
      "relatedTopic": "関連するタグやトピック名",
      "category": "仕事 または アイデア または 学習 または 健康 または 買い物 または 趣味",
      "sourceName": "メディア名・情報源名",
      "publishedAt": "YYYY-MM-DD（または直近の時期）",
      "url": "記事のURL（わかる場合）"
    }
  ]
}`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const [insightsRes, newsRes] = await Promise.all([
      insightsPromise,
      groundedNewsPromise,
    ]);

    // Parse Insights
    const insightsRaw = insightsRes.text?.trim() || '{}';
    const parsedInsights = JSON.parse(insightsRaw);
    const updatedAt = getCurrentJSTDateParts().fullDateTime;

    const insights: AIInsightSummary = {
      updatedAt,
      headline:
        parsedInsights.headline ||
        `「${queryTopic}」を中心に知的好奇心と実践アクションが連動`,
      overview:
        parsedInsights.overview ||
        '保存されたメモから、日々の業務推進・学習インプット・生活習慣の改善が相互に関連しながら記録されています。',
      keyThemes: Array.isArray(parsedInsights.keyThemes)
        ? parsedInsights.keyThemes.slice(0, 3).map((t: Record<string, string>) => ({
            topic: String(t.topic || '注目テーマ'),
            category: VALID_CATEGORIES.includes(t.category as CategoryId)
              ? (t.category as CategoryId)
              : '仕事',
            momentum: String(t.momentum || '注目'),
            description: String(t.description || ''),
          }))
        : [],
      actionSuggestion:
        parsedInsights.actionSuggestion ||
        '直近のメモで挙げた課題やアイデアから1つを選び、週末に15分の小さな検証タスクとしてスケジュール化してみましょう。',
    };

    // Extract Grounding Chunks (real URLs from Google Search Grounding)
    const groundingLinks: {title: string; uri: string}[] = [];
    const chunks =
      newsRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          groundingLinks.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
        }
      }
    }

    // Parse Grounded News Text (2-stage parsing: prioritize ```json ... ``` fenced block, then fallback to {[\s\S]*})
    const rawNewsText = newsRes.text?.trim() || '';
    let groundedSummaryText = '';
    let parsedNewsList: RelatedNewsItem[] = [];

    try {
      const codeBlockMatch = rawNewsText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const rawJsonCandidate = codeBlockMatch
        ? codeBlockMatch[1].trim()
        : rawNewsText.match(/\{[\s\S]*\}/)?.[0] || '';

      if (rawJsonCandidate) {
        const newsObj = JSON.parse(rawJsonCandidate);
        if (typeof newsObj.groundedSummary === 'string') {
          groundedSummaryText = newsObj.groundedSummary;
        }
        if (Array.isArray(newsObj.newsItems)) {
          parsedNewsList = newsObj.newsItems
            .slice(0, 5)
            .map((item: Record<string, string>, idx: number) => {
              const matchedGrounding = groundingLinks[idx];
              const cat = VALID_CATEGORIES.includes(item.category as CategoryId)
                ? (item.category as CategoryId)
                : '学習';
              const rawUrl =
                typeof item.url === 'string' && /^https?:\/\//i.test(item.url)
                  ? item.url
                  : matchedGrounding?.uri;
              return {
                id: `grounded-news-${Date.now()}-${idx}`,
                title: String(
                  item.title || matchedGrounding?.title || '最新トレンド記事'
                ),
                summary: String(item.summary || ''),
                relatedTopic: String(item.relatedTopic || queryTopic),
                category: cat,
                sourceName: String(
                  item.sourceName ||
                    matchedGrounding?.title ||
                    'Google Search Grounding'
                ),
                publishedAt: String(
                  item.publishedAt || updatedAt.slice(0, 10)
                ),
                url: rawUrl,
              };
            });
        }
      }
    } catch {
      // If Gemini with googleSearch returned free-form markdown instead of JSON
      groundedSummaryText = rawNewsText;
    }

    // If parsedNewsList is empty (e.g. free-form markdown response), construct news items from groundingLinks
    if (parsedNewsList.length === 0 && groundingLinks.length > 0) {
      parsedNewsList = groundingLinks.slice(0, 4).map((link, idx) => ({
        id: `grounded-chunk-${Date.now()}-${idx}`,
        title: link.title,
        summary: `あなたの関心トピック「${queryTopic}」に関連してGoogle検索グラウンディングで検出された最新Web情報です。`,
        relatedTopic: queryTopic,
        category: (topCategories[0] as CategoryId) || '学習',
        sourceName: 'Google Web Search',
        publishedAt: updatedAt.slice(0, 10),
        url: link.uri,
      }));
    }

    return NextResponse.json({
      insights,
      news: parsedNewsList,
      groundingLinks: groundingLinks.slice(0, 8),
      groundedSummaryText,
      queryTopic,
      source: 'gemini-google-search',
    });
  } catch (error: unknown) {
    console.error('Gemini Insights & Search Grounding error:', error);
    const errMsg =
      error instanceof Error
        ? error.message
        : 'AIトレンド分析・Webニュース検索中にエラーが発生しました。';
    return NextResponse.json({error: errMsg}, {status: 500});
  }
}
