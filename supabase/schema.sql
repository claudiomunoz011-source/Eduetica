-- ============================================================
-- EduÉtica — Supabase Schema
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: user_sessions
-- Stores each student's profile and session data
-- Fields 'age' and 'selected_topic' are sent to Gemini AI
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  establishment   TEXT NOT NULL,
  course          TEXT NOT NULL,
  age             SMALLINT NOT NULL CHECK (age >= 8 AND age <= 18),
  avatar          TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'de', 'fr', 'en')),
  selected_topic  TEXT,                          -- filled after topic selection
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  last_active     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: dilemma_answers
-- Stores each student's answers to dilemmas
-- ============================================================
CREATE TABLE IF NOT EXISTS dilemma_answers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  dilemma_id          UUID,                      -- references dilemmas_cache if cached
  answer              TEXT NOT NULL CHECK (answer IN ('moral', 'inmoral', 'amoral', 'negligente', 'ignorancia')),
  is_correct          BOOLEAN,
  response_time_ms    INTEGER,
  chat_interactions   INTEGER DEFAULT 0,
  answered_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: dilemmas_cache
-- Caches AI-generated dilemmas to reuse and save API tokens
-- content JSON: { scenario, question, correct_answer, explanation, options_hint }
-- ============================================================
CREATE TABLE IF NOT EXISTS dilemmas_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic       TEXT NOT NULL,
  language    TEXT NOT NULL CHECK (language IN ('es', 'de', 'fr', 'en')),
  age_group   TEXT NOT NULL CHECK (age_group IN ('junior', 'senior')),
  content     JSONB NOT NULL,
  used_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_dilemmas_cache_topic_lang_age
  ON dilemmas_cache(topic, language, age_group);

-- ============================================================
-- VIEW: leaderboard
-- Calculates ranking per course in real time
-- ============================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  us.id           AS session_id,
  us.name,
  us.course,
  us.establishment,
  us.avatar,
  us.selected_topic,
  COUNT(da.id)            AS total_answers,
  SUM(CASE WHEN da.is_correct THEN 1 ELSE 0 END)  AS correct_answers,
  SUM(CASE WHEN NOT da.is_correct THEN 1 ELSE 0 END) AS wrong_answers,
  AVG(da.response_time_ms)  AS avg_response_time_ms,
  SUM(da.chat_interactions) AS total_chat_interactions
FROM user_sessions us
LEFT JOIN dilemma_answers da ON da.session_id = us.id
GROUP BY us.id, us.name, us.course, us.establishment, us.avatar, us.selected_topic
ORDER BY correct_answers DESC, avg_response_time_ms ASC;

-- ============================================================
-- ROW LEVEL SECURITY (basic)
-- ============================================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dilemma_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dilemmas_cache ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert/read for student sessions
CREATE POLICY "Allow anonymous insert" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert answers" ON dilemma_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read answers" ON dilemma_answers FOR SELECT USING (true);
CREATE POLICY "Allow read cache" ON dilemmas_cache FOR SELECT USING (true);
-- Only service role can insert/update cache (server-side)
CREATE POLICY "Service role cache write" ON dilemmas_cache FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role cache update" ON dilemmas_cache FOR UPDATE USING (auth.role() = 'service_role');

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE dilemma_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
