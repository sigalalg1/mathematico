-- Run this once in the Supabase SQL editor for the project.
-- Stores one row per completed (or in-progress) game session.

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  questions_count int not null default 0,
  correct_count int not null default 0,
  mistakes jsonb not null default '[]'::jsonb
);

create index if not exists game_sessions_user_id_idx on public.game_sessions (user_id, started_at desc);

alter table public.game_sessions enable row level security;

-- Students can only ever see, create, or update their own sessions.
-- There is intentionally no delete policy — activity history is append-only.

create policy "select own game sessions"
  on public.game_sessions
  for select
  using (auth.uid() = user_id);

create policy "insert own game sessions"
  on public.game_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "update own game sessions"
  on public.game_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
