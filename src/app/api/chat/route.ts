import { NextRequest, NextResponse } from 'next/server';
import { 
  generateSocraticResponse, 
  getFallbackSocraticResponse, 
  type AnswerType, 
  type ConversationTurn 
} from '@/lib/gemini';
import { loadKnowledgeBase } from '@/lib/rag';
import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Capture required parameters globally so we can use them in the catch-fallback block
  let session_id: string | undefined;
  let dilemma_id: string | undefined;
  let topic: string | undefined;
  let age: string | undefined;
  let language: string | undefined;
  let selected_answer: string | undefined;
  let correct_answer: string | undefined;
  let dilemma_scenario: string | undefined;
  let history: any[] = [];
  let student_message: string | undefined;
  let turn_number: string | undefined;
  let response_time_ms: number | undefined;
  let custom_api_key: string | undefined;

  try {
    const body = await req.json();
    session_id = body.session_id;
    dilemma_id = body.dilemma_id;
    topic = body.topic;
    age = body.age;
    language = body.language;
    selected_answer = body.selected_answer;
    correct_answer = body.correct_answer;
    dilemma_scenario = body.dilemma_scenario;
    history = body.history || [];
    student_message = body.student_message;
    turn_number = body.turn_number;
    response_time_ms = body.response_time_ms;
    custom_api_key = body.custom_api_key;

    // Validate required fields
    if (!topic || !selected_answer || !correct_answer || !dilemma_scenario) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ageNum = parseInt(age || '13') || 13;
    const turn = parseInt(turn_number || '1') || 1;

    // Age-gate: students under 8 or over 18 shouldn't be here
    if (ageNum < 8 || ageNum > 18) {
      return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
    }

    // Force deterministic evaluation of student correctness based on selected vs correct answer
    const studentWasCorrect = selected_answer === correct_answer;

    // Load RAG knowledge base
    const ragContext = await loadKnowledgeBase();

    let response;
    let geminiErrorMsg: string | null = null;
    try {
      // Try to generate Socratic response using Gemini
      response = await generateSocraticResponse({
        topic,
        age: ageNum,
        language: language || 'es',
        dilemmaScenario: dilemma_scenario,
        selectedAnswer: selected_answer as AnswerType,
        correctAnswer: correct_answer as AnswerType,
        history: history as ConversationTurn[],
        studentMessage: student_message || '',
        turnNumber: turn,
        ragContext,
        customApiKey: custom_api_key,
      });
    } catch (geminiError: any) {
      console.warn('[Chat API] Gemini SDK failed, falling back to static dialogue:', geminiError);
      geminiErrorMsg = geminiError?.message || String(geminiError);
      // Fallback inside API to prevent 500 errors
      response = getFallbackSocraticResponse(
        turn,
        ageNum,
        selected_answer,
        correct_answer
      );
    }

    // If this is the final turn, save results to DB
    if (response.is_final && session_id) {
      const answerRecord = {
        session_id,
        dilemma_id: dilemma_id || null,
        answer: selected_answer,
        is_correct: studentWasCorrect,
        response_time_ms: response_time_ms || 0,
        chat_interactions: turn,
        understood: response.understood ?? false,
        dialogue_history: [...history,
          // Include the final tutor message
          {
            role: 'tutor',
            message: response.message,
            turn_number: turn,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      if (isSupabaseServerConfigured()) {
        // ── Supabase persistence ──────────────────────────────
        const supabase = createServerSupabaseClient();
        if (supabase) {
          const { error: insertError } = await supabase
            .from('dilemma_answers')
            .insert(answerRecord);

          if (insertError) {
            console.error('[Chat API] Supabase insert error:', insertError);
          } else {
            // Update session last_active
            await supabase
              .from('user_sessions')
              .update({ last_active: new Date().toISOString() })
              .eq('id', session_id);
          }
        }
      } else {
        console.log('[Chat API] Supabase not configured. Client handles localStorage.');
      }
    }

    return NextResponse.json({
      message: response.message,
      is_final: response.is_final,
      understood: response.understood,
      student_was_correct: studentWasCorrect,
      turn_number: turn,
      rag_loaded: !!ragContext,
      gemini_error: geminiErrorMsg,
    });
  } catch (error: any) {
    console.error('[Chat API] Global critical Error:', error);
    
    // In case of any critical crash, fallback immediately to prevent app blocking
    const ageNum = parseInt(age || '13') || 13;
    const turn = parseInt(turn_number || '1') || 1;
    const studentWasCorrect = selected_answer === correct_answer;
    const geminiErrorMsg = error?.message || String(error);
    
    const fallbackResponse = getFallbackSocraticResponse(
      turn,
      ageNum,
      selected_answer || 'moral',
      correct_answer || 'moral'
    );
    
    return NextResponse.json({
      message: fallbackResponse.message,
      is_final: fallbackResponse.is_final,
      understood: fallbackResponse.understood,
      student_was_correct: studentWasCorrect,
      turn_number: turn,
      rag_loaded: false,
      is_fallback_emergency: true,
      gemini_error: geminiErrorMsg,
    });
  }
}
