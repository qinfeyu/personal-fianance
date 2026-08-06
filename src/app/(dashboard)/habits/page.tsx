"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type Habit, type HabitLog } from "@/lib/types";
import { cn } from "@/lib/utils";
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
import { startOfWeek, addDays, format, isToday, parseISO } from "date-fns";

export default function HabitsPage() {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Week navigation (current offset in weeks from today)
  const [weekOffset, setWeekOffset] = useState(0);

  // Generate 7 days of the week based on current offset
  const getWeekDays = useCallback(() => {
    const today = new Date();
    const targetDate = addDays(today, weekOffset * 7);
    const startOfTargetWeek = startOfWeek(targetDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfTargetWeek, i));
  }, [weekOffset]);

  const weekDays = getWeekDays();
  const startOfWeekStr = format(weekDays[0], "yyyy-MM-dd");
  const endOfWeekStr = format(weekDays[6], "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch habits
    const { data: habitsData, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (habitsError) {
      setError(habitsError.message);
      setLoading(false);
      return;
    }

    // Fetch habit logs for this week range
    const { data: logsData, error: logsError } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startOfWeekStr)
      .lte("date", endOfWeekStr);

    if (logsError) {
      setError(logsError.message);
      setLoading(false);
      return;
    }

    setHabits(habitsData || []);
    setLogs(logsData || []);
    setLoading(false);
  }, [supabase, startOfWeekStr, endOfWeekStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    setSubmitting(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("User not authenticated.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("habits").insert({
      user_id: user.id,
      name: newHabitName.trim(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewHabitName("");
      await fetchData();
    }
    setSubmitting(false);
  }

  async function handleDeleteHabit(id: string) {
    if (!confirm("Are you sure you want to delete this habit and all its logs?")) return;
    setActionId(id);
    setError(null);
    const { error: deleteError } = await supabase.from("habits").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchData();
    }
    setActionId(null);
  }

  async function handleToggleDay(habitId: string, dateStr: string) {
    const existingLog = logs.find((l) => l.habit_id === habitId && l.date === dateStr);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (existingLog) {
      // Toggle or delete log
      const { error: toggleError } = await supabase
        .from("habit_logs")
        .delete()
        .eq("id", existingLog.id);

      if (toggleError) {
        setError(toggleError.message);
      } else {
        await fetchData();
      }
    } else {
      // Create new log
      const { error: toggleError } = await supabase.from("habit_logs").insert({
        habit_id: habitId,
        user_id: user.id,
        date: dateStr,
        completed: true,
      });

      if (toggleError) {
        setError(toggleError.message);
      } else {
        await fetchData();
      }
    }
  }

  // Statistics calculations
  const calculateStats = () => {
    if (habits.length === 0) return { completionRate: 0, bestHabit: "None", totalChecks: 0 };

    const totalPossible = habits.length * 7;
    const actualChecks = logs.length;
    const completionRate = totalPossible > 0 ? Math.round((actualChecks / totalPossible) * 100) : 0;

    // Find habit with highest checks this week
    const habitCounts = new Map<string, number>();
    logs.forEach((log) => {
      habitCounts.set(log.habit_id, (habitCounts.get(log.habit_id) || 0) + 1);
    });

    let maxChecks = 0;
    let bestHabitId = "";
    habitCounts.forEach((count, id) => {
      if (count > maxChecks) {
        maxChecks = count;
        bestHabitId = id;
      }
    });

    const bestHabitObj = habits.find((h) => h.id === bestHabitId);
    const bestHabit = bestHabitObj ? `${bestHabitObj.name} (${maxChecks}/7 days)` : "None";

    return { completionRate, bestHabit, totalChecks: actualChecks };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Navigation */}
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

        {/* Week Switcher */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="h-8 w-8 hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold text-white min-w-[170px] text-center flex items-center gap-1.5 justify-center">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="h-8 w-8 hover:bg-white/5"
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">Weekly Check-ins</p>
              <p className="text-xl font-bold text-white">{stats.totalChecks} completions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">Weekly Success Rate</p>
              <p className="text-xl font-bold text-white">{stats.completionRate}% completion</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">Most Consistent Habit</p>
              <p className="text-sm font-bold text-white truncate max-w-[180px]">{stats.bestHabit}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habit Tracker Table/Card */}
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
              onClick={handleAddHabit}
              className="h-8 text-xs gap-1"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
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
              <p className="text-white/20 text-xs">Add habits using the form above to start tracking</p>
            </div>
          ) : (
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.04] pb-2">
                  <th className="text-left text-xs font-semibold text-white/45 pb-3">Habit Name</th>
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
                  <th className="text-center text-xs font-semibold text-white/45 pb-3 w-16">Progress</th>
                  <th className="text-right pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {habits.map((habit) => {
                  const habitLogs = logs.filter((l) => l.habit_id === habit.id);
                  const isActioned = actionId === habit.id;

                  return (
                    <tr key={habit.id} className="group hover:bg-white/[0.01]">
                      {/* Name */}
                      <td className="py-4 pr-4">
                        <span className="text-sm font-medium text-white/90">
                          {habit.name}
                        </span>
                      </td>

                      {/* Day Checkboxes */}
                      {weekDays.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const isDone = logs.some(
                          (l) => l.habit_id === habit.id && l.date === dateStr
                        );
                        return (
                          <td key={dateStr} className="py-4 text-center">
                            <button
                              onClick={() => handleToggleDay(habit.id, dateStr)}
                              className={cn(
                                "mx-auto w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-150 active:scale-95",
                                isDone
                                  ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30"
                                  : "border-white/10 hover:border-white/20 bg-white/5 text-transparent hover:text-white/20"
                              )}
                              aria-label={`Toggle habit ${habit.name} for ${dateStr}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      })}

                      {/* Progress */}
                      <td className="py-4 text-center">
                        <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                          {habitLogs.length}/7
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteHabit(habit.id)}
                          disabled={isActioned}
                          aria-label="Delete habit"
                        >
                          {isActioned ? (
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
    </div>
  );
}
