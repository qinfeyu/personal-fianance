-- ============================================================
-- Personal Finance App — Supabase SQL Setup Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. CATEGORIES TABLE
-- ============================================================
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text default '💰',
  color text default '#6366f1',
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

drop policy if exists "Users can manage own categories" on public.categories;

create policy "Users can manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. MONTHS TABLE
-- ============================================================
create table if not exists public.months (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year int not null,
  month int not null check (month between 1 and 12),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, year, month)
);

alter table public.months enable row level security;

drop policy if exists "Users can manage own months" on public.months;

create policy "Users can manage own months"
  on public.months for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. CATEGORY BUDGETS TABLE
-- ============================================================
create table if not exists public.category_budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  year int not null,
  month int not null check (month between 1 and 12),
  budget_limit numeric(12,2) default 0 check (budget_limit >= 0),
  created_at timestamptz default now(),
  unique(user_id, category_id, year, month)
);

alter table public.category_budgets enable row level security;

drop policy if exists "Users can manage own category budgets"
  on public.category_budgets;

create policy "Users can manage own category budgets"
  on public.category_budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. TRANSACTIONS TABLE
-- ============================================================
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  -- Generated columns for easy monthly grouping
  year int generated always as (extract(year from date)::int) stored,
  month int generated always as (extract(month from date)::int) stored,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

drop policy if exists "Users can manage own transactions"
  on public.transactions;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Performance indexes
create index if not exists idx_transactions_user_month
  on public.transactions(user_id, year, month);

create index if not exists idx_transactions_user_category
  on public.transactions(user_id, category_id);

create index if not exists idx_transactions_date
  on public.transactions(date desc);

create index if not exists idx_category_budgets_user_month
  on public.category_budgets(user_id, year, month);

-- ============================================================
-- 6. SEED DEFAULT CATEGORIES FUNCTION
-- ============================================================
-- Call this function after first sign-in (handled in app code)
-- or run manually: SELECT seed_default_categories('<your-user-uuid>');
create or replace function public.seed_default_categories(p_user_id uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, icon, color, sort_order)
  values
    (p_user_id, 'Rent',            '🏠', '#ef4444', 1),
    (p_user_id, 'Groceries',       '🛒', '#f97316', 2),
    (p_user_id, 'Gym',             '💪', '#22c55e', 3),
    (p_user_id, 'Transportation',  '🚌', '#3b82f6', 4),
    (p_user_id, 'Subscriptions',   '📱', '#8b5cf6', 5),
    (p_user_id, 'Additional',      '🛍️', '#ec4899', 6),
    (p_user_id, 'Gas',             '⛽', '#f59e0b', 7),
    (p_user_id, 'Savings',         '🏦', '#10b981', 8)
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE! Tables created:
--   public.profiles
--   public.categories
--   public.months
--   public.category_budgets
--   public.transactions
-- ============================================================
