import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Returns null if credentials are not configured yet
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey);

// Types matching the database schema
export interface UserSession {
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

export interface DilemmaAnswer {
  id: string;
  session_id: string;
  dilemma_id?: string;
  answer: 'moral' | 'inmoral' | 'amoral' | 'negligente' | 'ignorancia';
  is_correct?: boolean;
  response_time_ms?: number;
  chat_interactions: number;
  answered_at: string;
}

export interface DilemmaCache {
  id: string;
  topic: string;
  language: string;
  age_group: 'junior' | 'senior';
  content: {
    scenario: string;
    question: string;
    correct_answer: 'moral' | 'inmoral' | 'amoral' | 'negligente' | 'ignorancia';
    explanation: string;
    options_hint?: string;
  };
  used_count: number;
  created_at: string;
}

export interface LeaderboardEntry {
  session_id: string;
  name: string;
  course: string;
  establishment: string;
  avatar: string;
  selected_topic: string;
  total_answers: number;
  correct_answers: number;
  wrong_answers: number;
  avg_response_time_ms: number;
  total_chat_interactions: number;
}
