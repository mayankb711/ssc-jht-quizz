-- ============================================================
-- SSC JHT Quiz — Supabase schema
-- Run this once in the Supabase SQL editor, then paste the
-- Project URL + anon public key into the app's Settings.
-- ============================================================

create table if not exists public.attempts (
  id          text primary key,
  user_id     uuid not null default auth.uid(),
  question_id text not null,
  topic       text,
  skill       text,
  correct     boolean not null,
  chosen      integer,
  ts          bigint not null,           -- epoch ms
  mode        text,                      -- 'mock' | 'quick' | 'topic'
  created_at  timestamptz not null default now()
);

-- Row-level security: a user only sees their own attempts.
alter table public.attempts enable row level security;

drop policy if exists "own attempts select" on public.attempts;
create policy "own attempts select" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "own attempts upsert" on public.attempts;
create policy "own attempts upsert" on public.attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "own attempts update" on public.attempts;
create policy "own attempts update" on public.attempts
  for update using (auth.uid() = user_id);

-- Index for fast per-user pulls.
create index if not exists attempts_user_idx on public.attempts (user_id, ts);
