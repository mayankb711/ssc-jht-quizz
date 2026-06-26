-- ============================================================
-- SSC JHT Quiz — Supabase schema
-- Run this once in the Supabase SQL editor, then paste the
-- Project URL + anon public key into the app's Settings.
-- ============================================================

-- 1. Attempts (every answered question)
create table if not exists public.attempts (
  id          text primary key,
  user_id     uuid not null default auth.uid(),
  question_id text not null,
  topic       text,
  skill       text,
  correct     boolean not null,
  chosen      integer,
  ts          bigint not null,
  mode        text,
  created_at  timestamptz not null default now()
);

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

create index if not exists attempts_user_idx on public.attempts (user_id, ts);

-- 2. Settings (synced preferences)
create table if not exists public.settings (
  user_id     uuid primary key default auth.uid(),
  theme       text default 'dark',
  neuron_cap  integer default 8000,
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "own settings select" on public.settings;
create policy "own settings select" on public.settings
  for select using (auth.uid() = user_id);

drop policy if exists "own settings upsert" on public.settings;
create policy "own settings upsert" on public.settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "own settings update" on public.settings;
create policy "own settings update" on public.settings
  for update using (auth.uid() = user_id);

-- 3. Generated questions (AI-backed, persisted)
create table if not exists public.generated_questions (
  id          text primary key,
  user_id     uuid not null default auth.uid(),
  topic       text,
  stem        text not null,
  options     jsonb not null,
  answer      integer not null,
  lang        text default 'en',
  passage     text,
  skill       text,
  difficulty  integer default 3,
  created_at  timestamptz not null default now()
);

alter table public.generated_questions enable row level security;

drop policy if exists "own gen questions select" on public.generated_questions;
create policy "own gen questions select" on public.generated_questions
  for select using (auth.uid() = user_id);

drop policy if exists "own gen questions upsert" on public.generated_questions;
create policy "own gen questions upsert" on public.generated_questions
  for insert with check (auth.uid() = user_id);

drop policy if exists "own gen questions update" on public.generated_questions;
create policy "own gen questions update" on public.generated_questions
  for update using (auth.uid() = user_id);

create index if not exists gen_questions_user_idx on public.generated_questions (user_id);
