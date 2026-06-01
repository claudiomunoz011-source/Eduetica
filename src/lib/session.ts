/**
 * Session management — Supabase-first, localStorage fallback.
 * Phase 2: Full Supabase integration.
 */
import { createClient } from '@supabase/supabase-js';

// ---- Client-side Supabase ----
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface UserProfile {
  id: string;
  name: string;
  establishment: string;
  course: string;
  age: number;
  avatar: string;
  language: string;
  selectedTopic?: string | null;
  startedAt: string;
}

export interface StudentRecord {
  profile: UserProfile;
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTimeMs: number;
  chatInteractions: number;
  understoodCount: number;
}

export interface DialogueResult {
  dilemmaId?: string;
  selectedAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  turnCount: number;
  understood: boolean;
  dialogueHistory: Array<{ role: string; message: string; timestamp: string }>;
}

const SESSION_KEY = 'edeuetica_session';
const LEADERBOARD_KEY = 'edeuetica_leaderboard';
const DILEMMAS_CACHE_KEY = 'edeuetica_dilemmas_cache';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC 4122 UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

export async function saveSession(
  profileData: Omit<UserProfile, 'id' | 'startedAt'>
): Promise<UserProfile> {
  const session: UserProfile = {
    ...profileData,
    id: generateId(),
    startedAt: new Date().toISOString(),
  };

  // Always save to localStorage as fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    _upsertLocalLeaderboard(session);
    localStorage.removeItem(DILEMMAS_CACHE_KEY); // Clear dilemma cache on new registration
  }

  // Try Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('user_sessions').insert({
        id: session.id,
        name: session.name,
        establishment: session.establishment,
        course: session.course,
        age: session.age,
        avatar: session.avatar,
        language: session.language,
        selected_topic: session.selectedTopic || null,
        started_at: session.startedAt,
        last_active: session.startedAt,
      });
      if (error) console.error('[Session] Supabase insert error:', error);
    }
  } catch (err) {
    console.error('[Session] Supabase error (using localStorage):', err);
  }

  return session;
}

export function getSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function updateSessionTopic(topic: string): Promise<void> {
  const session = getSession();
  if (!session) return;

  session.selectedTopic = topic;
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('user_sessions')
        .update({ selected_topic: topic, last_active: new Date().toISOString() })
        .eq('id', session.id);
    }
  } catch (err) {
    console.error('[Session] updateSessionTopic error:', err);
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ============================================================
// LEADERBOARD
// ============================================================

export function getLeaderboard(): StudentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function _upsertLocalLeaderboard(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  const leaderboard = getLeaderboard();
  const idx = leaderboard.findIndex((s) => s.profile.id === profile.id);
  const record: StudentRecord = {
    profile,
    totalAnswers: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    totalTimeMs: 0,
    chatInteractions: 0,
    understoodCount: 0,
  };
  if (idx >= 0) {
    leaderboard[idx].profile = profile;
  } else {
    leaderboard.push(record);
  }
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

// ============================================================
// DIALOGUE RESULT RECORDING
// ============================================================

/**
 * Records the full result of a Socratic dialogue session.
 * Called when the tutor delivers the final verdict (turn 3).
 */
export async function recordDialogueResult(result: DialogueResult): Promise<void> {
  const session = getSession();
  if (!session) return;

  // Update localStorage leaderboard
  if (typeof window !== 'undefined') {
    const leaderboard = getLeaderboard();
    const idx = leaderboard.findIndex((s) => s.profile.id === session.id);
    if (idx >= 0) {
      leaderboard[idx].totalAnswers++;
      leaderboard[idx].totalTimeMs += result.responseTimeMs;
      leaderboard[idx].chatInteractions += result.turnCount;
      if (result.isCorrect) leaderboard[idx].correctAnswers++;
      else leaderboard[idx].wrongAnswers++;
      if (result.understood) leaderboard[idx].understoodCount++;
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    }
  }

  // Save to Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('dilemma_answers').insert({
        session_id: session.id,
        dilemma_id: result.dilemmaId || null,
        answer: result.selectedAnswer,
        is_correct: result.isCorrect,
        response_time_ms: result.responseTimeMs,
        chat_interactions: result.turnCount,
        understood: result.understood,
        dialogue_history: result.dialogueHistory,
      });
      if (error) console.error('[Session] recordDialogueResult Supabase error:', error);
    }
  } catch (err) {
    console.error('[Session] recordDialogueResult error:', err);
  }
}

/**
 * Legacy: simple answer recording (used when chat is skipped)
 */
export async function recordAnswer(
  isCorrect: boolean,
  responseTimeMs: number
): Promise<void> {
  await recordDialogueResult({
    selectedAnswer: '',
    isCorrect,
    responseTimeMs,
    turnCount: 0,
    understood: false,
    dialogueHistory: [],
  });
}

// ============================================================
// DILEMMA CACHE (localStorage)
// ============================================================

export function getCachedDilemma(
  topic: string,
  language: string,
  ageGroup: string,
  exclude: string[] = []
): object | null {
  if (typeof window === 'undefined') return null;
  try {
    const cache = JSON.parse(localStorage.getItem(DILEMMAS_CACHE_KEY) || '{}');
    const key = `${topic}_${language}_${ageGroup}`;
    const items: any[] = cache[key] || [];
    if (items.length === 0) return null;
    
    // Filter out already seen scenarios
    const available = items.filter(d => !exclude.includes(d.scenario));
    if (available.length === 0) return null;
    
    return available[Math.floor(Math.random() * available.length)];
  } catch {
    return null;
  }
}

export function cacheDilemma(
  topic: string,
  language: string,
  ageGroup: string,
  dilemma: object
): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = JSON.parse(localStorage.getItem(DILEMMAS_CACHE_KEY) || '{}');
    const key = `${topic}_${language}_${ageGroup}`;
    if (!cache[key]) cache[key] = [];
    const exists = cache[key].some(
      (d: { scenario?: string }) =>
        d.scenario === (dilemma as { scenario?: string }).scenario
    );
    if (!exists) {
      cache[key].push(dilemma);
      if (cache[key].length > 20) cache[key].shift();
    }
    localStorage.setItem(DILEMMAS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // silent
  }
}
