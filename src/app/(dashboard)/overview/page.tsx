"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  ArrowUpRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  LayoutDashboard,
  ListTodo,
  Target,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboard } from "@/hooks/useDashboard";
import { useGym } from "@/hooks/useGym";
import { useGoals } from "@/hooks/useGoals";
import { useHabits } from "@/hooks/useHabits";
import { useLoans } from "@/hooks/useLoans";
import { useTodos } from "@/hooks/useTodos";
import {
  activeGoalsForPeriod,
  completedHabitLogsByDate,
  countLoggedExercises,
  countSessionsInMonth,
  getCurrentWeekBounds,
  lastSessionForDay,
  outstandingLoanTotal,
} from "@/lib/overview";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateInput,
  friendlyErrorMessage,
  getCurrentMonthYear,
  getMonthYearLabel,
  parseLocalDate,
} from "@/lib/utils";

interface OverviewCardProps {
  title: string;
  caption: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  loading: boolean;
  error: unknown;
  children: ReactNode;
}

function OverviewCard({
  title,
  caption,
  href,
  icon: Icon,
  accent,
  loading,
  error,
  children,
}: OverviewCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                accent
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm">{title}</CardTitle>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">
                {caption}
              </p>
            </div>
          </div>
          <Link
            href={href}
            aria-label={`Open ${title}`}
            className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {loading ? (
          <div className="space-y-2 animate-pulse" aria-label="Loading">
            <div className="h-7 w-24 rounded bg-white/[0.06]" />
            <div className="h-3 w-full rounded bg-white/[0.04]" />
            <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
          </div>
        ) : error ? (
          <p role="alert" className="text-xs text-red-400">
            {friendlyErrorMessage(error, `Couldn't load ${title.toLowerCase()}.`)}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-white/30">{label}</p>
      <p
        className={cn(
          "text-xs font-semibold mt-0.5 truncate",
          valueClassName ?? "text-white/90"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function OverviewPage() {
  const { year, month } = getCurrentMonthYear();
  const week = useMemo(() => getCurrentWeekBounds(), []);
  const today = useMemo(() => formatDateInput(new Date()), []);

  const finance = useDashboard(year, month);
  const todos = useTodos();
  const habits = useHabits(week.start, week.end);
  const goals = useGoals();
  const gym = useGym();
  const loans = useLoans();

  const recentTransactions = useMemo(
    () => (finance.data ? finance.data.transactions.slice(0, 3) : []),
    [finance.data]
  );
  const outstanding = useMemo(
    () => (loans.data ? outstandingLoanTotal(loans.data) : 0),
    [loans.data]
  );

  const todoList = useMemo(() => (todos.data ? todos.data : []), [todos.data]);
  const openTodos = useMemo(
    () => todoList.filter((todo) => !todo.completed).slice(0, 3),
    [todoList]
  );
  const openTodoCount = todoList.filter((todo) => !todo.completed).length;
  const doneTodoCount = todoList.length - openTodoCount;

  const habitList = useMemo(
    () => (habits.data ? habits.data.habits : []),
    [habits.data]
  );
  const habitLogs = useMemo(
    () => (habits.data ? habits.data.logs : []),
    [habits.data]
  );
  const checksByDate = useMemo(
    () => completedHabitLogsByDate(habitLogs),
    [habitLogs]
  );
  const todayChecks = checksByDate.get(today) ?? 0;
  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(parseLocalDate(week.start), index)
      ),
    [week.start]
  );

  const goalList = useMemo(() => (goals.data ? goals.data : []), [goals.data]);
  const periodGoals = useMemo(
    () => activeGoalsForPeriod(goalList),
    [goalList]
  );
  const completedGoals = periodGoals.filter((goal) => goal.completed).length;
  const goalProgress = periodGoals.length
    ? Math.round((completedGoals / periodGoals.length) * 100)
    : 0;

  const sessions = useMemo(() => (gym.data ? gym.data.sessions : []), [gym.data]);
  const gymDays = useMemo(() => (gym.data ? gym.data.days : []), [gym.data]);
  const monthWorkouts = countSessionsInMonth(sessions, year, month);
  const trackedExercises = countLoggedExercises(sessions);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-violet-400" />
          Overview
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")} · everything in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Finance */}
        <OverviewCard
          title="Finance"
          caption={getMonthYearLabel(year, month)}
          href="/dashboard"
          icon={Wallet}
          accent="bg-violet-500/15 text-violet-300"
          loading={finance.isLoading}
          error={finance.error}
        >
          {finance.data && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <MiniStat
                  label="Income"
                  value={formatCurrency(finance.data.summary.totalIncome)}
                  valueClassName="text-emerald-400"
                />
                <MiniStat
                  label="Spent"
                  value={formatCurrency(finance.data.summary.totalExpenses)}
                  valueClassName="text-red-400"
                />
                <MiniStat
                  label="Left"
                  value={formatCurrency(finance.data.summary.remaining)}
                  valueClassName={
                    finance.data.summary.remaining >= 0
                      ? "text-violet-300"
                      : "text-orange-400"
                  }
                />
              </div>

              <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
                {recentTransactions.length === 0 ? (
                  <p className="text-[11px] text-white/30 italic">
                    No transactions this month.
                  </p>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 min-w-0 text-white/60">
                        <span className="flex-shrink-0">
                          {transaction.categories?.icon ??
                            (transaction.type === "income" ? "💰" : "🧾")}
                        </span>
                        <span className="truncate">
                          {transaction.description ||
                            transaction.categories?.name ||
                            (transaction.type === "income"
                              ? "Income"
                              : "Expense")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex-shrink-0 font-medium",
                          transaction.type === "income"
                            ? "text-emerald-400"
                            : "text-white/70"
                        )}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {outstanding > 0 && (
                <p className="text-[10px] text-white/30 border-t border-white/[0.06] pt-2">
                  Outstanding loans:{" "}
                  <span className="text-amber-300/90">
                    {formatCurrency(outstanding)}
                  </span>
                </p>
              )}
            </div>
          )}
        </OverviewCard>

        {/* To-Do */}
        <OverviewCard
          title="To-Do"
          caption={`${openTodoCount} open · ${doneTodoCount} done`}
          href="/todo"
          icon={ListTodo}
          accent="bg-sky-500/15 text-sky-300"
          loading={todos.isLoading}
          error={todos.error}
        >
          {openTodos.length === 0 ? (
            <p className="text-xs text-emerald-400/80">
              All caught up — nothing open right now.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                {openTodoCount}
                <span className="text-xs font-normal text-white/30 ml-1.5">
                  tasks left
                </span>
              </p>
              <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
                {openTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 text-[11px] text-white/65"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70 flex-shrink-0" />
                    <span className="truncate">{todo.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </OverviewCard>

        {/* Habits */}
        <OverviewCard
          title="Habits"
          caption={`${habitList.length} habits tracked this week`}
          href="/habits"
          icon={Flame}
          accent="bg-orange-500/15 text-orange-300"
          loading={habits.isLoading}
          error={habits.error}
        >
          <div className="space-y-3">
            <p className="text-2xl font-bold text-white">
              {todayChecks}
              <span className="text-xs font-normal text-white/30 ml-1.5">
                of {habitList.length} checked today
              </span>
            </p>
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((date) => {
                const dateStr = formatDateInput(date);
                const count = checksByDate.get(dateStr) ?? 0;
                const isToday = dateStr === today;

                return (
                  <div key={dateStr} className="text-center">
                    <p
                      className={cn(
                        "text-[9px] mb-1",
                        isToday ? "text-violet-300" : "text-white/25"
                      )}
                    >
                      {format(date, "EEE").slice(0, 1)}
                    </p>
                    <div
                      className={cn(
                        "h-7 rounded-md flex items-center justify-center text-[10px] font-medium",
                        count > 0
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.03] text-white/20",
                        isToday && "ring-1 ring-violet-400/50"
                      )}
                      aria-label={`${count} habit checks on ${formatDate(dateStr)}`}
                    >
                      {count > 0 ? count : "·"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </OverviewCard>

        {/* Goals */}
        <OverviewCard
          title="Goals"
          caption="Current period progress"
          href="/goals"
          icon={Target}
          accent="bg-rose-500/15 text-rose-300"
          loading={goals.isLoading}
          error={goals.error}
        >
          {periodGoals.length === 0 ? (
            <p className="text-xs text-white/30 italic">
              No goals for this period yet.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-white">
                  {completedGoals}
                  <span className="text-sm font-normal text-white/30">
                    /{periodGoals.length}
                  </span>
                </p>
                <span className="text-xs text-rose-300">{goalProgress}%</span>
              </div>
              <Progress
                value={goalProgress}
                indicatorClassName="bg-rose-500"
                aria-label="Goals completed"
              />
              <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
                {periodGoals.slice(0, 3).map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <CheckCircle2
                      className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        goal.completed
                          ? "text-emerald-400"
                          : "text-white/20"
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        goal.completed
                          ? "text-white/35 line-through"
                          : "text-white/65"
                      )}
                    >
                      {goal.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </OverviewCard>

        {/* Gym */}
        <OverviewCard
          title="Gym"
          caption="Your training log"
          href="/gym"
          icon={Dumbbell}
          accent="bg-emerald-500/15 text-emerald-300"
          loading={gym.isLoading}
          error={gym.error}
        >
          <div className="space-y-3">
            <p className="text-2xl font-bold text-white">
              {monthWorkouts}
              <span className="text-xs font-normal text-white/30 ml-1.5">
                workouts this month
              </span>
            </p>
            {gymDays.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {gymDays.map((day) => {
                  const lastSession = lastSessionForDay(sessions, day.id);
                  return (
                    <div
                      key={day.id}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 min-w-0"
                    >
                      <p className="text-[10px] text-white/50 truncate">
                        {day.name}
                      </p>
                      <p className="text-[10px] text-emerald-400/80 mt-0.5 truncate">
                        {lastSession ? formatDate(lastSession.date) : "Not logged"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-white/30 border-t border-white/[0.06] pt-2">
              {trackedExercises} exercise{trackedExercises === 1 ? "" : "s"}{" "}
              with logged sets
            </p>
          </div>
        </OverviewCard>
      </div>
    </div>
  );
}
