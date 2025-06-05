-- Database views for easier querying of trivia session data

-- View for session leaderboards with user details
CREATE OR REPLACE VIEW session_leaderboards AS
SELECT 
  ts.id as session_id,
  ts.date as session_date,
  ts.category,
  ts.session_type,
  ts.status as session_status,
  ts.timer_duration,
  ts.total_participants,
  ts.highest_score,
  usp.user_id,
  usp.score,
  usp.total_questions,
  usp.correct_answers,
  usp.time_taken,
  usp.status as participation_status,
  usp.started_at,
  usp.completed_at,
  CASE 
    WHEN usp.user_id = ANY(ts.winner_user_ids) THEN true 
    ELSE false 
  END as is_winner,
  ROW_NUMBER() OVER (
    PARTITION BY ts.id 
    ORDER BY usp.score DESC, usp.time_taken ASC NULLS LAST
  ) as rank,
  ROUND((usp.correct_answers::DECIMAL / NULLIF(usp.total_questions, 0)) * 100, 1) as accuracy_percentage
FROM trivia_sessions ts
LEFT JOIN user_session_participations usp ON ts.id = usp.session_id
WHERE usp.status = 'completed'
ORDER BY ts.date DESC, usp.score DESC, usp.time_taken ASC;

-- View for daily winners summary
CREATE OR REPLACE VIEW daily_winners AS
SELECT DISTINCT
  ts.date,
  ts.category,
  ts.session_type,
  ts.highest_score,
  ts.total_participants,
  unnest(ts.winner_user_ids) as winner_user_id,
  usp.score,
  usp.correct_answers,
  usp.total_questions,
  usp.time_taken,
  usp.completed_at
FROM trivia_sessions ts
JOIN user_session_participations usp ON ts.id = usp.session_id
WHERE usp.user_id = ANY(ts.winner_user_ids)
  AND usp.status = 'completed'
ORDER BY ts.date DESC;

-- View for session statistics summary
CREATE OR REPLACE VIEW session_statistics AS
SELECT 
  ts.id as session_id,
  ts.date,
  ts.category,
  ts.session_type,
  ts.status,
  ts.total_participants,
  ts.highest_score,
  COALESCE(stats.completed_participants, 0) as completed_participants,
  COALESCE(stats.average_score, 0) as average_score,
  COALESCE(stats.average_time, 0) as average_time,
  COALESCE(stats.perfect_scores, 0) as perfect_scores,
  COALESCE(stats.completion_rate, 0) as completion_rate
FROM trivia_sessions ts
LEFT JOIN (
  SELECT 
    session_id,
    COUNT(*) as completed_participants,
    ROUND(AVG(score), 2) as average_score,
    ROUND(AVG(time_taken), 0) as average_time,
    COUNT(*) FILTER (WHERE score = total_questions) as perfect_scores,
    ROUND((COUNT(*)::DECIMAL / NULLIF(MAX(total_questions), 0)) * 100, 1) as completion_rate
  FROM user_session_participations 
  WHERE status = 'completed'
  GROUP BY session_id
) stats ON ts.id = stats.session_id
ORDER BY ts.date DESC;

-- View for user participation history
CREATE OR REPLACE VIEW user_participation_history AS
SELECT 
  usp.user_id,
  ts.date,
  ts.category,
  ts.session_type,
  usp.score,
  usp.total_questions,
  usp.correct_answers,
  usp.time_taken,
  usp.status,
  usp.started_at,
  usp.completed_at,
  CASE 
    WHEN usp.user_id = ANY(ts.winner_user_ids) THEN true 
    ELSE false 
  END as won_session,
  ROW_NUMBER() OVER (
    PARTITION BY ts.id 
    ORDER BY usp.score DESC, usp.time_taken ASC NULLS LAST
  ) as session_rank,
  ROUND((usp.correct_answers::DECIMAL / NULLIF(usp.total_questions, 0)) * 100, 1) as accuracy_percentage
FROM user_session_participations usp
JOIN trivia_sessions ts ON usp.session_id = ts.id
ORDER BY ts.date DESC, usp.score DESC;

-- Indexes for better performance on views
CREATE INDEX IF NOT EXISTS idx_user_session_participations_status ON user_session_participations (status);
CREATE INDEX IF NOT EXISTS idx_user_session_participations_score ON user_session_participations (score DESC);
CREATE INDEX IF NOT EXISTS idx_trivia_sessions_date_status ON trivia_sessions (date, status);

-- Comments for documentation
COMMENT ON VIEW session_leaderboards IS 'Complete leaderboard view for each trivia session with rankings and user performance';
COMMENT ON VIEW daily_winners IS 'Daily winners summary with their performance metrics';
COMMENT ON VIEW session_statistics IS 'Aggregated statistics for each trivia session';
COMMENT ON VIEW user_participation_history IS 'Complete participation history for users across all sessions'; 