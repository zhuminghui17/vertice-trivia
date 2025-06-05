-- questions table schema
-- questions table records all questions and answers

-- create questions table
create table public.questions (
  id uuid not null default extensions.uuid_generate_v4 (),
  date date not null default CURRENT_DATE,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  category text not null,
  generated_at timestamp without time zone null default now(),
  constraint questions_pkey primary key (id)
) TABLESPACE pg_default;