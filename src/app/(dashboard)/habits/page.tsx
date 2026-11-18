"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useAddHabit,
  useDeleteHabit,
  useHabits,
  useToggleHabit,
} from "@/hooks/useHabits";
import { type Habit, type HabitLog } from "@/lib/types";
import { cn, friendlyErrorMessage } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
  Loader2,
  Calendar,
} from "lucide-react";
import { startOfWeek, addDays, format, isToday } from "date-fns";

export default function HabitsPage() {
  const [newHabitName, setNewHabitName] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  const weekDays = useMemo(() => {
    const today = new Date();
    const targetDate = addDays(today, weekOffset * 7);
    const startOfTargetWeek = startOfWeek(targetDate, { weekStartsOn: 1 });

    return Array.from({ length: 7 }).map((_, i) =>
      addDays(startOfTargetWeek, i)
    );
  }, [weekOffset]);

  const startOfWeekStr = format(weekDays[0], "yyyy-MM-dd");
  const endOfWeekStr = format(weekDays[6], "yyyy-MM-dd");

  const habitsQuery = useHabits(startOfWeekStr, endOfWeekStr);
  const addHabit = useAddHabit(startOfWeekStr, endOfWeekStr);
  const deleteHabit = useDeleteHabit(startOfWeekStr, endOfWeekStr);
  const toggleHabit = useToggleHabit(startOfWeekStr, endOfWeekStr);

  const habits = useMemo(
    () => habitsQuery.data?.habits ?? [],
    [habitsQuery.data?.habits]
  );
  const logs = useMemo(
    () => habitsQuery.data?.logs ?? [],
    [habitsQuery.data?.logs]
  );
  const loading = habitsQuery.isLoading;
  const submitting = addHabit.isPending;

  // One lookup per cell instead of scanning every log for every habit/day.
  const logsByDay = useMemo(() => {
    const map = new Map<string, HabitLog>();
    for (const log of logs) map.set(`${log.habit_id}:${log.date}`, log);
    return map;
  }, [logs]);

  const checksByHabit = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      counts.set(log.habit_id, (counts.get(log.habit_id) ?? 0) + 1);
    }
    return counts;
  }, [logs]);

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault();
    const name = newHabitName.trim();

    if (!name) return;

    try {
      await addHabit.mutateAsync(name);
      setNewHabitName("");
    } catch {
      // The mutation surfaces its own error toast.
    }
  }

  function handleDeleteHabit() {
    if (!habitToDelete) return;

    deleteHabit.mutate(habitToDelete);
    setHabitToDelete(null);
  }

  function handleToggleDay(habitId: string, dateStr: string) {
    const existingLog = logsByDay.get(`${habitId}:${dateStr}`);

    toggleHabit.mutate({ habitId, date: dateStr, existingLog });
  }

  const stats = (() => {
    if (habits.length === 0) {
      return { completionRate: 0, bestHabit: "None", totalChecks: 0 };
    }

    const totalPossible = habits.length * 7;
    const actualChecks = logs.length;
    const completionRate =
      totalPossible > 0 ? Math.round((actualChecks / totalPossible) * 100) : 0;

    let maxChecks = 0;
    let bestHabitId = "";

    checksByHabit.forEach((count, id) => {
      if (count > maxChecks) {
        maxChecks = count;
        bestHabitId = id;
      }
    });

    const bestHabitObj = habits.find((habit) => habit.id === bestHabitId);
    const bestHabit = bestHabitObj
      ? `${bestHabitObj.name} (${maxChecks}/7 days)`
      : "None";

    return { completionRate, bestHabit, totalChecks: actualChecks };
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            Weekly Habit Tracker
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Build consistency by checking off habits daily
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="h-8 w-8 hover:bg-white/5"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold text-white min-w-[170px] text-center flex items-center gap-1.5 justify-center">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            {format(weekDays[0], "MMM d")} –{" "}
            {format(weekDays[6], "MMM d, yyyy")}
            {habitsQuery.isFetching && (
              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="h-8 w-8 hover:bg-white/5"
            disabled={weekOffset >= 0}
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {habitsQuery.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {friendlyErrorMessage(habitsQuery.error, "Couldn't load your habits.")}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">
                Weekly Check-ins
              </p>
              <p className="text-xl font-bold text-white">
                {stats.totalChecks} completions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">
                Weekly Success Rate
              </p>
              <p className="text-xl font-bold text-white">
                {stats.completionRate}% completion
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">
                Most Consistent Habit
              </p>
              <p className="text-sm font-bold text-white truncate max-w-[180px]">
                {stats.bestHabit}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Weekly Habits Check-off</CardTitle>
          <form onSubmit={handleAddHabit} className="flex gap-2 w-full sm:w-auto">
            <Input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Add habit (e.g. Read 30m, Gym...)"
              disabled={submitting}
              className="h-8 max-w-xs text-xs"
            />
            <Button
              type="submit"
              disabled={submitting || !newHabitName.trim()}
              size="sm"
              className="h-8 text-xs gap-1"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add Habit
            </Button>
          </form>
        </CardHeader>

        <CardContent className="pt-6 overflow-x-auto">
          {loading ? (
            <div className="space-y-4 py-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">🎯</p>
              <p className="text-white/40 text-sm">No habits configured yet</p>
              <p className="text-white/20 text-xs">
                Add habits using the form above to start tracking
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.04] pb-2">
                  <th className="text-left text-xs font-semibold text-white/45 pb-3">
                    Habit Name
                  </th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="text-center pb-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-white/40">
                          {format(day, "eee")}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                            isToday(day)
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/50"
                              : "text-white/80"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center text-xs font-semibold text-white/45 pb-3 w-16">
                    Progress
                  </th>
                  <th className="text-right pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {habits.map((habit) => {
                  const checkCount = checksByHabit.get(habit.id) ?? 0;
                  const isDeleting =
                    deleteHabit.isPending &&
                    deleteHabit.variables?.id === habit.id;

                  return (
                    <tr key={habit.id} className="group hover:bg-white/[0.01]">
                      <td className="py-4 pr-4">
                        <span className="text-sm font-medium text-white/90">
                          {habit.name}
                        </span>
                      </td>

                      {weekDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const isDone = logsByDay.has(
                          `${habit.id}:${dateStr}`
                        );
                        const isToggling =
                          toggleHabit.isPending &&
                          toggleHabit.variables?.habitId === habit.id &&
                          toggleHabit.variables?.date === dateStr;

                        return (
                          <td key={dateStr} className="py-4 text-center">
                            <button
                              onClick={() => handleToggleDay(habit.id, dateStr)}
                              disabled={isToggling}
                              className={cn(
                                "mx-auto w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-150 active:scale-95",
                                isDone
                                  ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30"
                                  : "border-white/10 hover:border-white/20 bg-white/5 text-transparent hover:text-white/20"
                              )}
                              aria-label={`Toggle habit ${habit.name} for ${dateStr}`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-4 text-center">
                        <Badge
                          variant="outline"
                          className="border-violet-500/30 text-violet-300"
                        >
                          {checkCount}/7
                        </Badge>
                      </td>

                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => setHabitToDelete(habit)}
                          disabled={isDeleting}
                          aria-label="Delete habit"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={habitToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setHabitToDelete(null);
        }}
        title="Delete habit?"
        description={
          habitToDelete
            ? `"${habitToDelete.name}" and all of its logs will be permanently deleted.`
            : ""
        }
        onConfirm={handleDeleteHabit}
      />
    </div>
  );
}
