-- Training system — completed practice and personal-challenge sessions.
--
-- Run after supabase/schema.sql in the Supabase SQL editor. Additive: nothing
-- in game_sessions changes. game_sessions stays the general-purpose activity
-- log; this table is the structured, queryable record a personal best is
-- derived from, keyed by a fixed challenge configuration.
--
-- Accuracy and average-time-per-question are NOT stored: they are derived from
-- the counts and durations below, so a row can never carry figures that
-- disagree with itself. Personal bests are likewise derived (in the app, from
-- these rows) rather than kept as a separate mutable "current best" row that
-- could drift; the pace-eligibility rule is per activity and therefore lives
-- with the activity definition, not in SQL.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The fixed configuration this result was produced under. A record is only
  -- ever compared against results sharing all four of these.
  activity_id text not null,
  difficulty_id text,
  question_count int not null check (question_count > 0),
  rules_version int not null,
  -- Denormalised "activity|difficulty|count|vN" key, so history for one
  -- configuration is a single indexed lookup.
  configuration_key text not null,

  mode text not null check (mode in ('practice', 'challenge')),

  started_at timestamptz not null,
  completed_at timestamptz not null,
  -- Active start -> finish, including feedback beats but excluding any span
  -- the session was paused or the tab was hidden/backgrounded.
  total_duration_ms int not null check (total_duration_ms >= 0),
  -- Sum of the per-question active think times only: app-controlled animation
  -- and feedback delays, paused time and hidden time are all excluded, so pace
  -- measures the child, not the UI and not a phone left locked mid-session.
  answering_duration_ms int not null check (answering_duration_ms >= 0),

  total_questions int not null check (total_questions >= 0),
  correct_count int not null check (correct_count >= 0),
  longest_streak int not null check (longest_streak >= 0),

  constraint training_sessions_correct_within_total check (correct_count <= total_questions),
  constraint training_sessions_streak_within_total check (longest_streak <= total_questions)
);

create index if not exists training_sessions_config_idx
  on public.training_sessions (user_id, configuration_key, completed_at desc);

alter table public.training_sessions enable row level security;

-- Same pattern as game_sessions: a student can only ever read or add their own
-- results. There is intentionally no update or delete policy — a completed
-- result is immutable, which is what makes a personal best trustworthy.

create policy "select own training sessions"
  on public.training_sessions
  for select
  using (auth.uid() = user_id);

create policy "insert own training sessions"
  on public.training_sessions
  for insert
  with check (auth.uid() = user_id);
