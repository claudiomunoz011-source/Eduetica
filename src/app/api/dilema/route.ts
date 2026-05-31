import { NextRequest, NextResponse } from 'next/server';
import { generateDilemma } from '@/lib/gemini';
import { loadKnowledgeBase, getLoadedFiles } from '@/lib/rag';
import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SENIOR_ONLY_TOPICS = ['euthanasia', 'abortion', 'deathPenalty', 'corruption'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, age, language, session_id, exclude, custom_api_key } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const ageNum = parseInt(age) || 13;
    const ageGroup = ageNum < 14 ? 'junior' : 'senior';
    const lang = language || 'es';
    const excludedScenarios = Array.isArray(exclude) ? (exclude as string[]) : [];

    // Server-side age gate for sensitive topics
    if (SENIOR_ONLY_TOPICS.includes(topic) && ageGroup === 'junior') {
      return NextResponse.json(
        { error: 'Topic not available for this age group' },
        { status: 403 }
      );
    }

    // ── Try Supabase cache first ──────────────────────────────
    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        // Fetch up to 30 cached dilemmas for this topic and age group
        const { data: cached } = await supabase
          .from('dilemmas_cache')
          .select('id, content, used_count')
          .eq('topic', topic)
          .eq('language', lang)
          .eq('age_group', ageGroup);

        if (cached && cached.length > 0) {
          // Filter out cached dilemmas whose scenario is in the excluded list
          const available = cached.filter(pick => {
            const scenario = (pick.content as any)?.scenario || '';
            return !excludedScenarios.includes(scenario);
          });

          if (available.length > 0) {
            // Sort by used_count ascending and pick a random one from the least used 3
            const sorted = available.sort((a, b) => (a.used_count || 0) - (b.used_count || 0));
            const pool = sorted.slice(0, 3);
            const pick = pool[Math.floor(Math.random() * pool.length)];

            // Increment used_count
            await supabase
              .from('dilemmas_cache')
              .update({ used_count: (pick.used_count || 0) + 1 })
              .eq('id', pick.id);

            return NextResponse.json({
              dilemma: pick.content,
              dilemma_id: pick.id,
              cached: true,
              rag_files: getLoadedFiles(),
            });
          }
        }
      }
    }

    // ── Load RAG context ──────────────────────────────────────
    const ragContext = await loadKnowledgeBase();

    // ── Generate with Gemini ──────────────────────────────────
    const dilemma = await generateDilemma(topic, ageGroup, lang, ragContext, excludedScenarios, custom_api_key);

    // ── Save to Supabase cache ────────────────────────────────
    let dilemmaId: string | undefined;
    if (isSupabaseServerConfigured()) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        const { data: inserted } = await supabase
          .from('dilemmas_cache')
          .insert({
            topic,
            language: lang,
            age_group: ageGroup,
            content: dilemma,
            used_count: 1,
          })
          .select('id')
          .single();
        dilemmaId = inserted?.id;

        // Update session last_active
        if (session_id) {
          await supabase
            .from('user_sessions')
            .update({ last_active: new Date().toISOString() })
            .eq('id', session_id);
        }
      }
    }

    return NextResponse.json({
      dilemma,
      dilemma_id: dilemmaId || null,
      cached: false,
      rag_files: getLoadedFiles(),
    });
  } catch (error) {
    console.error('[Dilema API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate dilemma' }, { status: 500 });
  }
}
