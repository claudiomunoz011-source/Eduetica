import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const course = searchParams.get('course');
    const establishment = searchParams.get('establishment');

    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        let query = supabase
          .from('leaderboard')
          .select('*')
          .order('correct_answers', { ascending: false })
          .limit(50);

        if (course) query = query.eq('course', course);
        if (establishment) query = query.eq('establishment', establishment);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ leaderboard: data || [], source: 'supabase' });
      }
    }

    // Fallback: client uses localStorage
    return NextResponse.json({ leaderboard: [], source: 'localStorage' });
  } catch (error) {
    console.error('[Leaderboard GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id, dilemma_id, answer, is_correct,
      response_time_ms, chat_interactions, understood, dialogue_history,
    } = body;

    if (!session_id || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validAnswers = ['moral', 'inmoral', 'amoral', 'negligente', 'ignorancia'];
    if (!validAnswers.includes(answer)) {
      return NextResponse.json({ error: 'Invalid answer type' }, { status: 400 });
    }

    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from('dilemma_answers').insert({
          session_id,
          dilemma_id: dilemma_id || null,
          answer,
          is_correct: is_correct ?? false,
          response_time_ms: response_time_ms || 0,
          chat_interactions: chat_interactions || 0,
          understood: understood ?? false,
          dialogue_history: dialogue_history || [],
        });
        if (error) {
          console.error('[Leaderboard POST] Supabase error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Update session last_active
        await supabase
          .from('user_sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', session_id);

        return NextResponse.json({ recorded: true, source: 'supabase' }, { status: 201 });
      }
    }

    // Phase 1 fallback
    return NextResponse.json({ recorded: true, source: 'localStorage' }, { status: 201 });
  } catch (error) {
    console.error('[Leaderboard POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
