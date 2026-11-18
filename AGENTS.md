<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personal Finance / LifeOrganizer

Next.js 16 App Router + Supabase (auth/Postgres/RLS), Tailwind v4, shadcn-style UI. Modules: finance dashboard, todos, habits, goals, loans, recurring transactions.

## Commands
- `npm run dev` / `npm run build` / `npm run start`; `npm run lint` is bare `eslint` (no args).
- No test suite and no `typecheck` script. Verify with `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- `.env.local` is gitignored and absent; create it with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before running.
- On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use `npm.cmd` / `npx.cmd`.
- Path alias `@/*` maps to `./src/*` (tsconfig). ESLint uses flat config (`eslint.config.mjs`).

## Next.js 16 gotchas
- Route protection lives in `src/proxy.ts` exporting `proxy()` (Next 16 renamed `middleware` → `proxy`). `src/lib/supabase/middleware.ts` is its helper, not auto-loaded middleware. A root `middleware.ts` is **silently ignored at build time** → auth redirects stop; never create one.
- Session refresh depends on copying `supabaseResponse` cookies onto redirect responses in `updateSession` (`src/lib/supabase/middleware.ts`). If you add a redirect there, copy the cookies too or users appear logged out.
- Request APIs are async-only: `await cookies()`, and `params`/`searchParams` are Promises. Follow `src/lib/supabase/server.ts`.
- Tailwind v4 is CSS-first (`@import "tailwindcss"` + `@theme` in `src/app/globals.css`; no tailwind.config). Reuse `src/components/ui/*` primitives via `cn()` from `src/lib/utils.ts`.

## Data layer
- All pages are `"use client"` and query Supabase from the browser via RLS; only sign-out is a server action. Server guard: `src/app/(dashboard)/layout.tsx` (`force-dynamic`, `getUser()`), which also provides `UserIdProvider` (`src/lib/user-context.tsx`).
- TanStack Query is the client cache. Global provider/defaults live in `src/app/providers.tsx`; hooks live in `src/hooks/use*.ts`; all keys are centralized in `src/lib/query-keys.ts` and include `userId` to prevent cross-user cache leakage.
- Mutations use optimistic updates with rollback + toast errors. Prefer `mutation.isPending`/`mutation.variables` over local action-id state. Use `isLoading` for first-load skeletons; `isFetching` only for background-refresh indicators.
- `useDashboard` first calls `ensureMonthReady` (`src/lib/seed.ts`): `ensure_month_ready` RPC when the performance migration is applied, otherwise a client fallback that seeds categories and recurring transactions. Use `getTodayLocal()` for date-only values, never `toISOString()`.
- `transactions.year` / `month` are **generated columns** from `date` — never insert or update them. `src/lib/types.ts` mirrors DB rows and is the source of truth.
- Default categories are seeded once per user via `ensureMonthReady`; do not add per-page seeding. Recurring templates are materialized per month (expense-only), deduped by a unique partial index on `transactions(recurring_transaction_id, year, month)` plus `recurring_transaction_dismissals` for user-deleted instances.
- Loans use the `record_loan_repayment` RPC when available; the client fallback is non-atomic and only for un-migrated databases.
- `src/components/dashboard/LoansTracker.tsx` is loaded on scroll via `LazyLoansTracker`; keep heavy below-fold widgets dynamically imported.
- All tables have RLS; most are scoped by `user_id`, `profiles` by `id`. New tables need RLS plus a `user_id` index. `habit_logs` is unique on `(habit_id, date)`.
- Goals: `timeframe` is `semester | trimester | year`; periods are `YYYY-S1|S2`, `YYYY-T1|T2|T3` (T1 Jan–Apr, T2 May–Aug, T3 Sep–Dec), `YYYY`.
- `formatCurrency` is EUR (de-DE); `formatDate` appends `T00:00:00` to parse date-only strings in local time.
- Gym log: four reusable day slots, exercises per day, and dated sessions with per-set weight (kg) and reps. `src/hooks/useGym.ts` uses one `["gym", userId]` query, seeds the four days via `ensure_workout_days()` with a client fallback, and saves sessions atomically through `save_workout_session()` (also with a fallback). Set data is fetched as a nested `workout_sets` embed; `src/lib/gym.ts` derives last-session and personal-best summaries.
- The root page redirects to `/overview`, a read-only summary built from the existing module hooks; pure derivations live in `src/lib/overview.ts`.
- Navigation is centralized in `src/components/navigation/NavLinks.tsx` (desktop sidebar + mobile bottom bar) — add new pages there.

## Database migrations
- No migration toolchain; apply root SQL files manually in the Supabase SQL Editor. Order: `supabase_schema.sql` → `supabase_habits_goals_migration.sql` → `supabase_trimester_migration.sql` (replaces the `goals_timeframe_check` constraint, so it must run after habits_goals) → `supabase_loans_migration.sql` / `supabase_recurring_migration.sql` / `supabase_todo_migration.sql` / `supabase_gym_migration.sql` → `supabase_performance_migration.sql` last (it indexes todos/goals/loans and assumes recurring/loans exist).
- `supabase_performance_migration.sql` adds: idempotent `seed_default_categories`, `ensure_month_ready(year, month)`, atomic `record_loan_repayment`, `recurring_transaction_dismissals`, a unique partial index on recurring transactions, and list indexes. The app detects missing RPCs and falls back, so the app still runs before this migration is applied.
- Add new features as `supabase_<name>_migration.sql` matching existing style (RLS + indexes), and mirror new row shapes in `src/lib/types.ts`.

## Trust the code, not the README
README is stale: claims Next.js 15 and `src/middleware.ts`, and documents only the base schema. Actual runtime is Next 16.2.10 with `src/proxy.ts`.
