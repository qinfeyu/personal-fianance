-- ============================================================
-- To-Do List — Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Create todos table
create table if not exists public.todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.todos enable row level security;

-- 3. Create Policy
create policy "Users can manage own todos"
  on public.todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Create Index
create index if not exists idx_todos_user
  on public.todos(user_id, completed);
