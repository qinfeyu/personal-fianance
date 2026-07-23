-- ============================================================
-- Loans & Lending Tracker — Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Loans table
create table if not exists public.loans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  borrower_name text not null,
  original_amount numeric(12,2) not null check (original_amount > 0),
  amount_repaid numeric(12,2) not null default 0 check (amount_repaid >= 0),
  description text,
  date_lent date not null default current_date,
  due_date date,
  -- status: 'active' = still owed, 'repaid' = fully paid back, 'forgiven' = written off
  status text not null default 'active' check (status in ('active', 'repaid', 'forgiven')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.loans enable row level security;

create policy "Users can manage own loans"
  on public.loans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_loans_user_status
  on public.loans(user_id, status);

-- 2. Loan repayments log (history of every payment)
create table if not exists public.loan_repayments (
  id uuid default uuid_generate_v4() primary key,
  loan_id uuid references public.loans on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.loan_repayments enable row level security;

create policy "Users can manage own loan repayments"
  on public.loan_repayments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_loan_repayments_loan
  on public.loan_repayments(loan_id);

-- ============================================================
-- DONE. Tables created:
--   public.loans
--   public.loan_repayments
-- ============================================================
