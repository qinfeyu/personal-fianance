-- ============================================================
-- Habits & Goals Organizer — Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Create habits table
create table if not exists public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.habits enable row level security;

create policy "Users can manage own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Create habit logs table
create table if not exists public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  completed boolean default true,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

alter table public.habit_logs enable row level security;

create policy "Users can manage own habit logs"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_habit_logs_date
  on public.habit_logs(user_id, date);

-- 3. Create goals table
create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  timeframe text not null check (timeframe in ('semester', 'year')),
  period text not null, -- e.g. '2026-S1', '2026-S2', '2026'
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.goals enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_goals_timeframe
  on public.goals(user_id, timeframe, period);
