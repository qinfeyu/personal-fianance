import { addDays, format, startOfWeek } from "date-fns";
import type { Goal, HabitLog, Loan, WorkoutSession } from "@/lib/types";

/** Monday–Sunday bounds for the current week, as date-only strings. */
export function getCurrentWeekBounds(): { start: string; end: string } {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(addDays(start, 6), "yyyy-MM-dd"),
  };
}

/** The periods shown on the Goals page for today's date. */
export function getGoalPeriods(): Record<Goal["timeframe"], string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return {
    semester: `${year}-S${month <= 6 ? 1 : 2}`,
    trimester: `${year}-T${month <= 4 ? 1 : month <= 8 ? 2 : 3}`,
    year: `${year}`,
  };
}

export function activeGoalsForPeriod(goals: Goal[]): Goal[] {
  const periods = getGoalPeriods();
  return goals.filter((goal) => goal.period === periods[goal.timeframe]);
}

/** Completed habit checks per date, for the compact week strip. */
export function completedHabitLogsByDate(logs: HabitLog[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
  }
  return counts;
}

export function outstandingLoanTotal(loans: Loan[]): number {
  return loans
    .filter((loan) => loan.status === "active")
    .reduce(
      (total, loan) =>
        total + Math.max(0, loan.original_amount - loan.amount_repaid),
      0
    );
}

export function countSessionsInMonth(
  sessions: WorkoutSession[],
  year: number,
  month: number
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return sessions.filter((session) => session.date.startsWith(prefix)).length;
}

export function countLoggedExercises(sessions: WorkoutSession[]): number {
  const exerciseIds = new Set<string>();
  for (const session of sessions) {
    for (const set of session.workout_sets ?? []) {
      if (set.exercise_id) exerciseIds.add(set.exercise_id);
    }
  }
  return exerciseIds.size;
}

/** Sessions arrive newest-first from useGym, so the first match is the latest. */
export function lastSessionForDay(
  sessions: WorkoutSession[],
  dayId: string
): WorkoutSession | undefined {
  return sessions.find((session) => session.workout_day_id === dayId);
}
