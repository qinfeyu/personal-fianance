-- ============================================================
-- Recurring Transactions — Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. New table: recurring_transactions (templates)
create table if not exists public.recurring_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.recurring_transactions enable row level security;

create policy "Users can manage own recurring transactions"
  on public.recurring_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recurring_transactions_user
  on public.recurring_transactions(user_id, active);

-- 2. Add recurring_transaction_id to transactions table
--    (tracks which transactions were auto-seeded from a template)
alter table public.transactions
  add column if not exists recurring_transaction_id uuid
  references public.recurring_transactions(id) on delete set null;

create index if not exists idx_transactions_recurring
  on public.transactions(recurring_transaction_id)
  where recurring_transaction_id is not null;

-- ============================================================
-- DONE. You can now manage recurring transactions in the app.
-- ============================================================
