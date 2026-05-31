-- ============================================================
-- EduÉtica — Schema v2 Migration
-- Run this AFTER schema.sql to add Phase 2 fields
-- ============================================================

-- Add new columns to dilemma_answers
ALTER TABLE dilemma_answers
  ADD COLUMN IF NOT EXISTS understood       BOOLEAN,
  ADD COLUMN IF NOT EXISTS dialogue_history JSONB DEFAULT '[]'::jsonb;

-- Create user_sessions with ON CONFLICT support
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(id);

-- Update leaderboard view to include understood stats
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  us.id           AS session_id,
  us.name,
  us.course,
  us.establishment,
  us.avatar,
  us.selected_topic,
  us.age,
  COUNT(da.id)                                                  AS total_answers,
  SUM(CASE WHEN da.is_correct     THEN 1 ELSE 0 END)           AS correct_answers,
  SUM(CASE WHEN NOT da.is_correct THEN 1 ELSE 0 END)           AS wrong_answers,
  AVG(da.response_time_ms)                                      AS avg_response_time_ms,
  SUM(COALESCE(da.chat_interactions, 0))                        AS total_chat_interactions,
  SUM(CASE WHEN da.understood = true THEN 1 ELSE 0 END)        AS understood_count,
  ROUND(
    100.0 * SUM(CASE WHEN da.understood = true THEN 1 ELSE 0 END)
    / NULLIF(COUNT(da.id), 0)
  )                                                             AS understanding_pct
FROM user_sessions us
LEFT JOIN dilemma_answers da ON da.session_id = us.id
GROUP BY us.id, us.name, us.course, us.establishment, us.avatar, us.selected_topic, us.age
ORDER BY correct_answers DESC, avg_response_time_ms ASC;

-- Policy for updating answers (service role)
CREATE POLICY IF NOT EXISTS "Service update answers" ON dilemma_answers
  FOR UPDATE USING (auth.role() = 'service_role');

-- Enable Realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE dilemma_answers;
