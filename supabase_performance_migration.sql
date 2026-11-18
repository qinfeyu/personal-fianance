-- ============================================================
-- Performance & Integrity Migration
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. Make recurring seeding idempotent
-- ------------------------------------------------------------
-- Remove accidental duplicate auto-generated transactions from
-- earlier races, keeping the oldest row per template/month.
delete from public.transactions a
using public.transactions b
where a.recurring_transaction_id is not null
  and a.recurring_transaction_id = b.recurring_transaction_id
  and a.year = b.year
  and a.month = b.month
  and a.id > b.id;

create unique index if not exists uniq_transactions_recurring_month
  on public.transactions(recurring_transaction_id, year, month)
  where recurring_transaction_id is not null;

-- ------------------------------------------------------------
-- 2. Track recurring transactions the user dismissed for a month
-- ------------------------------------------------------------
create table if not exists public.recurring_transaction_dismissals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recurring_transaction_id uuid references public.recurring_transactions on delete cascade not null,
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz default now(),
  unique(user_id, recurring_transaction_id, year, month)
);

alter table public.recurring_transaction_dismissals enable row level security;

drop policy if exists "Users can manage own recurring dismissals"
  on public.recurring_transaction_dismissals;

create policy "Users can manage own recurring dismissals"
  on public.recurring_transaction_dismissals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recurring_dismissals_user_month
  on public.recurring_transaction_dismissals(user_id, year, month);

-- ------------------------------------------------------------
-- 3. Idempotent default category seeding
-- ------------------------------------------------------------
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.categories (user_id, name, icon, color, sort_order)
  select p_user_id, defaults.name, defaults.icon, defaults.color, defaults.sort_order
  from (values
    ('Rent',           '🏠', '#ef4444', 1),
    ('Groceries',      '🛒', '#f97316', 2),
    ('Gym',            '💪', '#22c55e', 3),
    ('Transportation', '🚌', '#3b82f6', 4),
    ('Subscriptions',  '📱', '#8b5cf6', 5),
    ('Additional',     '🛍️', '#ec4899', 6),
    ('Gas',            '⛽', '#f59e0b', 7),
    ('Savings',        '🏦', '#10b981', 8)
  ) as defaults(name, icon, color, sort_order)
  where not exists (
    select 1
    from public.categories existing
    where existing.user_id = p_user_id
      and existing.name = defaults.name
  );
end;
$$;

-- ------------------------------------------------------------
-- 4. One-round-trip month initialization
-- ------------------------------------------------------------
create or replace function public.ensure_month_ready(p_year int, p_month int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last_day int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_year < 1900 or p_year > 9999 or p_month < 1 or p_month > 12 then
    raise exception 'Invalid period';
  end if;

  perform public.seed_default_categories(v_user);

  v_last_day := extract(
    day from (
      make_date(p_year, p_month, 1)
      + interval '1 month'
      - interval '1 day'
    )
  )::int;

  insert into public.transactions (
    user_id,
    category_id,
    type,
    amount,
    description,
    date,
    recurring_transaction_id
  )
  select
    template.user_id,
    template.category_id,
    'expense',
    template.amount,
    template.description,
    make_date(p_year, p_month, least(template.day_of_month, v_last_day)),
    template.id
  from public.recurring_transactions template
  where template.user_id = v_user
    and template.active
    and not exists (
      select 1
      from public.transactions existing
      where existing.user_id = v_user
        and existing.recurring_transaction_id = template.id
        and existing.year = p_year
        and existing.month = p_month
    )
    and not exists (
      select 1
      from public.recurring_transaction_dismissals dismissed
      where dismissed.user_id = v_user
        and dismissed.recurring_transaction_id = template.id
        and dismissed.year = p_year
        and dismissed.month = p_month
    )
  on conflict do nothing;
end;
$$;

-- ------------------------------------------------------------
-- 5. Atomic loan repayment
-- ------------------------------------------------------------
create or replace function public.record_loan_repayment(
  p_loan_id uuid,
  p_amount numeric,
  p_date date default current_date,
  p_notes text default null
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_loan public.loans%rowtype;
  v_clamped numeric(12,2);
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and user_id = v_user
  for update;

  if not found then
    raise exception 'Loan not found';
  end if;

  if v_loan.status <> 'active' then
    raise exception 'Loan is not active';
  end if;

  v_clamped := least(p_amount, v_loan.original_amount - v_loan.amount_repaid);

  if v_clamped <= 0 then
    raise exception 'Loan is already settled';
  end if;

  insert into public.loan_repayments (loan_id, user_id, amount, date, notes)
  values (p_loan_id, v_user, v_clamped, coalesce(p_date, current_date), p_notes);

  update public.loans
  set
    amount_repaid = amount_repaid + v_clamped,
    status = case
      when amount_repaid + v_clamped >= original_amount then 'repaid'
      else status
    end,
    updated_at = now()
  where id = p_loan_id;

  return v_clamped;
end;
$$;

-- ------------------------------------------------------------
-- 6. Indexes for list ordering
-- ------------------------------------------------------------
create index if not exists idx_transactions_user_month_date
  on public.transactions(user_id, year, month, date desc);

create index if not exists idx_todos_user_created
  on public.todos(user_id, created_at desc);

create index if not exists idx_goals_user_created
  on public.goals(user_id, created_at desc);

create index if not exists idx_loans_user_created
  on public.loans(user_id, created_at desc);

create index if not exists idx_loan_repayments_loan_date
  on public.loan_repayments(loan_id, date desc);

grant execute on function public.ensure_month_ready(int, int) to authenticated;
grant execute on function public.record_loan_repayment(uuid, numeric, date, text) to authenticated;

-- ============================================================
-- DONE.
-- ============================================================
