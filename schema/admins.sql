-- admins table schema
-- admins table records all admins

create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint admins_pkey primary key (user_id),
  constraint admins_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;



-- some admins features:
-- 1. only admins can start the today's trivia game, functionality and UI to be added
-- 2. show admins icon at the bottom of the sidebar, next to signed in stuff, or next to user name ect
-- 
