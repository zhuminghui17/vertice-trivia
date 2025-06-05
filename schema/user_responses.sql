-- user_responses table schema
-- Stores individual user answers for each trivia session

CREATE TABLE public.user_responses (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  question_id UUID NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_responses_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_question_response UNIQUE (user_id, session_id, question_id),
  CONSTRAINT user_responses_session_fkey FOREIGN KEY (session_id) REFERENCES public.trivia_sessions (id) ON DELETE CASCADE,
  CONSTRAINT user_responses_question_fkey FOREIGN KEY (question_id) REFERENCES public.questions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for faster queries
CREATE INDEX idx_user_responses_user_session ON public.user_responses (user_id, session_id);
CREATE INDEX idx_user_responses_session ON public.user_responses (session_id); 