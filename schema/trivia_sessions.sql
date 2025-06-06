-- trivia_sessions table schema
-- Tracks daily trivia sessions with their questions and metadata

CREATE TABLE public.trivia_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NULL,
  question_ids UUID[] NOT NULL, -- Array of question IDs used in this session
  status public.session_status NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  session_type TEXT NOT NULL DEFAULT 'daily' CHECK (session_type IN ('daily', 'special')),
  timer_duration INTEGER NOT NULL DEFAULT 120, -- in seconds (2 minutes default)
  total_participants INTEGER DEFAULT 0, -- Track how many users participated
  highest_score INTEGER DEFAULT 0, -- Track the winning score
  winner_user_ids UUID[], -- Array of user IDs who achieved the highest score (handles ties)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/New_York'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/New_York'::text, now()),
  CONSTRAINT trivia_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT unique_session_per_date UNIQUE (date)
) TABLESPACE pg_default;

-- Create index for faster date queries
CREATE INDEX idx_trivia_sessions_date ON public.trivia_sessions (date);

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_trivia_sessions_updated_at BEFORE
UPDATE ON trivia_sessions FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 