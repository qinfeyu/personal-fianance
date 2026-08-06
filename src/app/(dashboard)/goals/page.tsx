"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type Goal } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  Target,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GoalsPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [timeframe, setTimeframe] = useState<"semester" | "year">("semester");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute current year and semester values for forms
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentSemester = currentMonth <= 6 ? 1 : 2;

  const defaultPeriod = timeframe === "semester"
    ? `${currentYear}-S${currentSemester}`
    : `${currentYear}`;

  const [period, setPeriod] = useState(defaultPeriod);

  // Reset period when timeframe changes
  useEffect(() => {
    setPeriod(
      timeframe === "semester"
        ? `${currentYear}-S${currentSemester}`
        : `${currentYear}`
    );
  }, [timeframe, currentYear, currentSemester]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGoals((data as Goal[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("User not authenticated.");
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase.from("goals").insert({
      user_id: user.id,
      title: newTitle.trim(),
      timeframe,
      period,
      completed: false,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewTitle("");
      await fetchGoals();
    }
    setAdding(false);
  }

  async function handleToggleGoal(goal: Goal) {
    setActionId(goal.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("goals")
      .update({ completed: !goal.completed })
      .eq("id", goal.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      await fetchGoals();
    }
    setActionId(null);
  }

  async function handleDeleteGoal(id: string) {
    setActionId(id);
    setError(null);
    const { error: deleteError } = await supabase.from("goals").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchGoals();
    }
    setActionId(null);
  }

  // Filter goals
  const semesterGoals = goals.filter((g) => g.timeframe === "semester");
  const yearGoals = goals.filter((g) => g.timeframe === "year");

  // Statistics
  const totalCompleted = goals.filter((g) => g.completed).length;
  const completionRate = goals.length > 0 ? Math.round((totalCompleted / goals.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-400" />
            Goals Organizer
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Organize and track your life benchmarks by semester and year
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          {completionRate}% success rate
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Add New Goal Card */}
      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Define New Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Title input */}
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Save €5,000, Read 10 books, Complete machine learning course..."
                disabled={adding}
                className="flex-1"
              />

              {/* Timeframe Select */}
              <div className="flex gap-2">
                <Select
                  value={timeframe}
                  onValueChange={(val: "semester" | "year") => setTimeframe(val)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="year">Full Year</SelectItem>
                  </SelectContent>
                </Select>

                {/* Period Select */}
                <Select value={period} onValueChange={(val) => setPeriod(val)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframe === "semester" ? (
                      <>
                        <SelectItem value={`${currentYear}-S1`}>
                          {currentYear} S1
                        </SelectItem>
                        <SelectItem value={`${currentYear}-S2`}>
                          {currentYear} S2
                        </SelectItem>
                        <SelectItem value={`${currentYear + 1}-S1`}>
                          {currentYear + 1} S1
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value={`${currentYear}`}>
                          {currentYear}
                        </SelectItem>
                        <SelectItem value={`${currentYear + 1}`}>
                          {currentYear + 1}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={adding || !newTitle.trim()} className="gap-1.5 shadow-lg shadow-violet-900/30">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Goal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Lists */}
      {loading ? (
        <div className="space-y-6">
          <Card className="animate-pulse h-48 bg-white/5 rounded-xl border-white/[0.08]" />
          <Card className="animate-pulse h-48 bg-white/5 rounded-xl border-white/[0.08]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Semester Goals */}
          <Card className="border-white/[0.08] bg-white/[0.03]">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                Semester Goals
                <Badge variant="outline" className="border-violet-500/30 text-violet-300 text-[10px]">
                  {semesterGoals.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {semesterGoals.length === 0 ? (
                <p className="text-center py-6 text-white/40 text-xs italic">
                  No semester goals added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {semesterGoals.map((goal) => {
                    const isActioned = actionId === goal.id;
                    return (
                      <div
                        key={goal.id}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150",
                          goal.completed
                            ? "border-white/[0.04] bg-white/[0.01] opacity-60"
                            : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                        )}
                      >
                        <div
                          onClick={() => !isActioned && handleToggleGoal(goal)}
                          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        >
                          {isActioned ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                          ) : goal.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/30 hover:text-violet-400 transition-colors flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span
                              className={cn(
                                "text-sm font-medium text-white/90 truncate",
                                goal.completed && "line-through text-white/40"
                              )}
                            >
                              {goal.title}
                            </span>
                            <span className="text-[10px] text-white/30 mt-0.5">
                              Period: {goal.period}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={isActioned}
                          aria-label="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Annual Goals */}
          <Card className="border-white/[0.08] bg-white/[0.03]">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                Annual Goals
                <Badge variant="outline" className="border-orange-500/30 text-orange-300 text-[10px]">
                  {yearGoals.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {yearGoals.length === 0 ? (
                <p className="text-center py-6 text-white/40 text-xs italic">
                  No annual goals added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {yearGoals.map((goal) => {
                    const isActioned = actionId === goal.id;
                    return (
                      <div
                        key={goal.id}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150",
                          goal.completed
                            ? "border-white/[0.04] bg-white/[0.01] opacity-60"
                            : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                        )}
                      >
                        <div
                          onClick={() => !isActioned && handleToggleGoal(goal)}
                          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        >
                          {isActioned ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                          ) : goal.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/30 hover:text-violet-400 transition-colors flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span
                              className={cn(
                                "text-sm font-medium text-white/90 truncate",
                                goal.completed && "line-through text-white/40"
                              )}
                            >
                              {goal.title}
                            </span>
                            <span className="text-[10px] text-white/30 mt-0.5">
                              Year: {goal.period}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={isActioned}
                          aria-label="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
