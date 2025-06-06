-- user_session_participations table schema
-- Tracks user completion status for each trivia session

CREATE TABLE public.user_session_participations (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER, -- in seconds
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/New_York'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_session_participations_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_session_participation UNIQUE (user_id, session_id),
  CONSTRAINT user_session_participations_session_fkey FOREIGN KEY (session_id) REFERENCES public.trivia_sessions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for faster queries
CREATE INDEX idx_user_participations_user ON public.user_session_participations (user_id);
CREATE INDEX idx_user_participations_session ON public.user_session_participations (session_id);
CREATE INDEX idx_user_participations_user_status ON public.user_session_participations (user_id, status); 