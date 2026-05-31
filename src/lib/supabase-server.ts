import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * Only use in API routes (never expose to client).
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const isSupabaseServerConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---- Typed DB helpers ----

export interface DbUserSession {
  id: string;
  name: string;
  establishment: string;
  course: string;
  age: number;
  avatar: string;
  language: string;
  selected_topic?: string;
  started_at: string;
  last_active: string;
}

export interface DbDilemmaAnswer {
  id?: string;
  session_id: string;
  dilemma_id?: string;
  answer: string;
  is_correct?: boolean;
  response_time_ms?: number;
  chat_interactions?: number;
  understood?: boolean;
  dialogue_history?: ConversationTurn[];
  answered_at?: string;
}

export interface ConversationTurn {
  role: 'tutor' | 'student';
  message: string;
  turn_number?: number;
  timestamp: string;
}

export interface DbDilemmaCache {
  id?: string;
  topic: string;
  language: string;
  age_group: 'junior' | 'senior';
  content: {
    scenario: string;
    question: string;
    correct_answer: string;
    explanation: string;
    options_hint?: string;
  };
  used_count?: number;
  created_at?: string;
}
