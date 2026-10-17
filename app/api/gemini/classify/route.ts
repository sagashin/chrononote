import {GoogleGenAI, Type} from '@google/genai';
import {NextRequest, NextResponse} from 'next/server';
import {inferCategoryAndTagsLocal} from '@/lib/chrononote-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        {error: 'テキストが空です'},
        {status: 400}
      );
    }

    const fallback = inferCategoryAndTagsLocal(text);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return NextResponse.json({
        ...fallback,
        source: 'local-heuristic',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `以下のユーザーの個人メモを分析し、最も適切な分野（仕事、アイデア、買い物、健康、学習、趣味、その他のいずれか1つ）、関連性の高い簡潔なタグ（2〜4個、#記号なし）、および1行の短いAIインサイトコメント（35文字以内）をJSONで出力してください。\n\nメモ内容: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description:
                '仕事、アイデア、買い物、健康、学習、趣味、その他 のいずれか1つ',
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: '2〜4個の短い日本語タグ（#を含めない）',
            },
            aiNote: {
              type: Type.STRING,
              description: 'メモに対する具体的で役立つ1行のインサイトや次の一手（35文字以内）',
            },
          },
          required: ['category', 'tags', 'aiNote'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return NextResponse.json({...fallback, source: 'fallback'});
    }

    const parsed = JSON.parse(rawText);
    const validCategories = ['仕事', 'アイデア', '買い物', '健康', '学習', '趣味', 'その他'];
    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : fallback.category;
    const tags =
      Array.isArray(parsed.tags) && parsed.tags.length > 0
        ? parsed.tags.map((t: string) => String(t).replace(/^[#＃]/, '').trim()).filter(Boolean).slice(0, 4)
        : fallback.tags;
    const aiNote =
      typeof parsed.aiNote === 'string' && parsed.aiNote.trim()
        ? parsed.aiNote.trim()
        : fallback.aiNote;

    return NextResponse.json({
      category,
      tags,
      aiNote,
      source: 'gemini',
    });
  } catch (error) {
    console.error('Classify API error:', error);
    return NextResponse.json(
      {error: 'AI分類リクエストに失敗しました。ローカル推論結果を使用します。'},
      {status: 200}
    );
  }
}
