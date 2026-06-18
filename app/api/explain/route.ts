import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { term, categoryStats } = await req.json();

    if (!term || typeof term !== 'string') {
      return NextResponse.json({ error: '用語を入力してください' }, { status: 400 });
    }

    // Build category context
    const categoryLines = Object.entries(categoryStats as Record<string, number>)
      .filter(([key]) => !String(key).includes('/') || (String(key).match(/\//g) || []).length < 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([cat, count]) => `  - ${cat}: ${count}件`)
      .join('\n');

    const categoryContext = categoryLines
      ? `\n\n【現在の分類状況】\n${categoryLines}\n※同じカテゴリに5件以上ある場合は、より細かいサブカテゴリを作成してください。`
      : '';

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: 'あなたはITコンサルタント・システム開発の専門家です。技術用語を分かりやすく解説し、適切に分類します。必ず有効なJSONのみで回答してください。マークダウンや説明文は含めず、JSONオブジェクトのみを返してください。',
      messages: [
        {
          role: 'user',
          content: `以下の用語について解説してください：「${term}」${categoryContext}

以下のJSON形式のみで回答してください（他のテキストは含めない）：
{
  "shortExplanation": "3文以内の短くわかりやすい解説（初心者向け）",
  "detailedExplanation": "詳細な解説（2〜3段落、技術的詳細・使用例・背景を含む）",
  "category": "大分類/中分類（必要に応じて小分類も追加）"
}

分類のガイドライン：
- 既存カテゴリをできるだけ再利用する
- 主要カテゴリ例：インフラストラクチャ、開発・プログラミング、セキュリティ、データベース、ネットワーク、クラウド、DevOps、プロジェクト管理、アーキテクチャ、AI・機械学習、ビジネス・コンサルティング
- カテゴリが多い場合はサブカテゴリで細分化する`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response - extract JSON from the text
    let text = content.text.trim();
    // Remove markdown code blocks if present
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    const parsed = JSON.parse(text);

    return NextResponse.json({
      shortExplanation: parsed.shortExplanation,
      detailedExplanation: parsed.detailedExplanation,
      category: parsed.category,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '解説の生成中にエラーが発生しました。もう一度試してください。' },
      { status: 500 }
    );
  }
}
