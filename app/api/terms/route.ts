import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('terms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const terms = (data ?? []).map((row: Record<string, string>) => ({
      id: row.id,
      term: row.term,
      shortExplanation: row.short_explanation,
      detailedExplanation: row.detailed_explanation,
      category: row.category,
      createdAt: row.created_at,
    }));

    return NextResponse.json(terms);
  } catch (error) {
    console.error('GET /api/terms error:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const term = await req.json();

    const { error } = await getSupabase().from('terms').upsert({
      id: term.id,
      term: term.term,
      short_explanation: term.shortExplanation,
      detailed_explanation: term.detailedExplanation,
      category: term.category,
      created_at: term.createdAt,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/terms error:', error);
    return NextResponse.json({ error: 'Failed to save term' }, { status: 500 });
  }
}
