-- scores table schema
-- scores table records all users scores and game stats, it's by user_id

-- create scores table
create table public.scores (
    user_id uuid not null default extensions.uuid_generate_v4 (),
    user_name text not null,
    score integer null default 0,
    games_played integer null default 0,
    games_won integer null default 0,
    updated_at timestamp with time zone null default timezone ('America/New_York'::text, now()),
    constraint scores_pkey primary key (user_id)
  ) TABLESPACE pg_default;



