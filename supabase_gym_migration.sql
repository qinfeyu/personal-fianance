-- ============================================================
-- Gym Lifting Log — Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. Your four training day slots
-- ------------------------------------------------------------
create table if not exists public.workout_days (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  sort_order int not null default 1 check (sort_order between 1 and 4),
  created_at timestamptz default now(),
  unique(user_id, sort_order)
);

alter table public.workout_days enable row level security;

drop policy if exists "Users can manage own workout days" on public.workout_days;

create policy "Users can manage own workout days"
  on public.workout_days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_workout_days_user
  on public.workout_days(user_id, sort_order);

-- ------------------------------------------------------------
-- 2. Reusable exercises for each day
-- ------------------------------------------------------------
create table if not exists public.workout_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  workout_day_id uuid references public.workout_days on delete cascade not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table public.workout_exercises enable row level security;

drop policy if exists "Users can manage own workout exercises"
  on public.workout_exercises;

create policy "Users can manage own workout exercises"
  on public.workout_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_workout_exercises_day
  on public.workout_exercises(user_id, workout_day_id, sort_order);

-- ------------------------------------------------------------
-- 3. A dated workout session
-- ------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  workout_day_id uuid references public.workout_days on delete cascade not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.workout_sessions enable row level security;

drop policy if exists "Users can manage own workout sessions"
  on public.workout_sessions;

create policy "Users can manage own workout sessions"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_workout_sessions_day_date
  on public.workout_sessions(user_id, workout_day_id, date desc);

-- ------------------------------------------------------------
-- 4. One row per set: weight in kg and repetitions
-- ------------------------------------------------------------
create table if not exists public.workout_sets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  session_id uuid references public.workout_sessions on delete cascade not null,
  exercise_id uuid references public.workout_exercises on delete set null,
  set_number int not null check (set_number > 0),
  weight numeric(8,2) not null check (weight >= 0),
  reps int not null check (reps > 0),
  created_at timestamptz default now()
);

alter table public.workout_sets enable row level security;

drop policy if exists "Users can manage own workout sets" on public.workout_sets;

create policy "Users can manage own workout sets"
  on public.workout_sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_workout_sets_session
  on public.workout_sets(user_id, session_id);

create index if not exists idx_workout_sets_exercise
  on public.workout_sets(user_id, exercise_id);

-- ------------------------------------------------------------
-- 5. Seed the four day slots on first visit (idempotent)
-- ------------------------------------------------------------
create or replace function public.ensure_workout_days()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  i int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  for i in 1..4 loop
    insert into public.workout_days (user_id, name, sort_order)
    values (v_user, 'Day ' || i, i)
    on conflict (user_id, sort_order) do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_workout_days() to authenticated;

-- ------------------------------------------------------------
-- 6. Save a whole session (sets included) in one transaction
-- ------------------------------------------------------------
create or replace function public.save_workout_session(
  p_day_id uuid,
  p_date date,
  p_notes text,
  p_sets jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session_id uuid;
  v_set jsonb;
  v_exercise_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_date is null or p_date > current_date then
    raise exception 'Invalid workout date';
  end if;

  if not exists (
    select 1 from public.workout_days d
    where d.id = p_day_id and d.user_id = v_user
  ) then
    raise exception 'Invalid workout day';
  end if;

  insert into public.workout_sessions (user_id, workout_day_id, date, notes)
  values (v_user, p_day_id, p_date, nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_session_id;

  for v_set in select * from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb))
  loop
    v_exercise_id := (v_set->>'exercise_id')::uuid;

    if not exists (
      select 1 from public.workout_exercises e
      where e.id = v_exercise_id
        and e.user_id = v_user
        and e.workout_day_id = p_day_id
    ) then
      raise exception 'Invalid exercise for this day';
    end if;

    insert into public.workout_sets
      (user_id, session_id, exercise_id, set_number, weight, reps)
    values (
      v_user,
      v_session_id,
      v_exercise_id,
      (v_set->>'set_number')::int,
      (v_set->>'weight')::numeric,
      (v_set->>'reps')::int
    );
  end loop;

  return v_session_id;
end;
$$;

grant execute on function public.save_workout_session(uuid, date, text, jsonb) to authenticated;
