-- ============================================================
-- Trimester Goals Support — Update Migration Script
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Alter goals timeframe check constraint to include 'trimester'
alter table public.goals drop constraint if exists goals_timeframe_check;
alter table public.goals add constraint goals_timeframe_check check (timeframe in ('semester', 'trimester', 'year'));
