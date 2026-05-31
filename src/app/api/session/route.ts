import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, establishment, course, age, avatar, language, id } = body;

    if (!name || !establishment || !course || !avatar) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof age !== 'number' || age < 8 || age > 18) {
      return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
    }

    const sessionId = id || crypto.randomUUID();
    const sessionData = {
      id: sessionId,
      name: name.trim(),
      establishment: establishment.trim(),
      course: course.trim(),
      age,
      avatar,
      language: language || 'es',
      selected_topic: null,
      started_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    };

    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('user_sessions')
          .upsert(sessionData, { onConflict: 'id' });
        if (error) {
          console.error('[Session POST] Supabase error:', error);
        }
      }
    }

    return NextResponse.json({ session: sessionData }, { status: 201 });
  } catch (error) {
    console.error('[Session POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, selected_topic } = body;

    if (!session_id || !selected_topic) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('user_sessions')
          .update({
            selected_topic,
            last_active: new Date().toISOString(),
          })
          .eq('id', session_id);
        if (error) console.error('[Session PATCH] Supabase error:', error);
      }
    }

    return NextResponse.json({ updated: true }, { status: 200 });
  } catch (error) {
    console.error('[Session PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
