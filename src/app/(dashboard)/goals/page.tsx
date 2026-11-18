"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useAddGoal,
  useDeleteGoal,
  useGoals,
  useToggleGoal,
} from "@/hooks/useGoals";
import { type Goal } from "@/lib/types";
import { cn, friendlyErrorMessage } from "@/lib/utils";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  Target,
  Calendar,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Timeframe = Goal["timeframe"];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const currentSemester = currentMonth <= 6 ? 1 : 2;
const currentTrimester = currentMonth <= 4 ? 1 : currentMonth <= 8 ? 2 : 3;

function getDefaultPeriod(timeframe: Timeframe): string {
  if (timeframe === "semester") return `${currentYear}-S${currentSemester}`;
  if (timeframe === "trimester") return `${currentYear}-T${currentTrimester}`;
  return `${currentYear}`;
}

interface GoalSectionProps {
  title: string;
  icon: ReactNode;
  badgeClassName: string;
  goals: Goal[];
  emptyText: string;
  periodPrefix: string;
  deletingId: string | null;
  onToggle: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

function GoalSection({
  title,
  icon,
  badgeClassName,
  goals,
  emptyText,
  periodPrefix,
  deletingId,
  onToggle,
  onDelete,
}: GoalSectionProps) {
  return (
    <Card className="border-white/[0.08] bg-white/[0.03]">
      <CardHeader className="pb-3 border-b border-white/[0.06]">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          <Badge
            variant="outline"
            className={cn("text-[10px]", badgeClassName)}
          >
            {goals.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {goals.length === 0 ? (
          <p className="text-center py-6 text-white/40 text-xs italic">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => {
              const isDeleting = deletingId === goal.id;

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
                  <button
                    type="button"
                    onClick={() => onToggle(goal)}
                    className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 text-left"
                  >
                    {goal.completed ? (
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
                        {periodPrefix}: {goal.period}
                      </span>
                    </div>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                    onClick={() => onDelete(goal)}
                    disabled={isDeleting}
                    aria-label="Delete goal"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const [newTitle, setNewTitle] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("semester");
  const [period, setPeriod] = useState(getDefaultPeriod("semester"));
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const goalsQuery = useGoals();
  const addGoal = useAddGoal();
  const toggleGoal = useToggleGoal();
  const deleteGoal = useDeleteGoal();

  const goals = goalsQuery.data ?? [];
  const adding = addGoal.isPending;
  const deletingId = deleteGoal.isPending
    ? deleteGoal.variables?.id ?? null
    : null;

  const semesterGoals = goals.filter((goal) => goal.timeframe === "semester");
  const trimesterGoals = goals.filter(
    (goal) => goal.timeframe === "trimester"
  );
  const yearGoals = goals.filter((goal) => goal.timeframe === "year");

  const totalCompleted = goals.filter((goal) => goal.completed).length;
  const completionRate =
    goals.length > 0 ? Math.round((totalCompleted / goals.length) * 100) : 0;

  function handleTimeframeChange(value: Timeframe) {
    setTimeframe(value);
    setPeriod(getDefaultPeriod(value));
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();

    if (!title) return;

    try {
      await addGoal.mutateAsync({ title, timeframe, period });
      setNewTitle("");
    } catch {
      // The mutation surfaces its own error toast.
    }
  }

  function handleDeleteGoal() {
    if (!goalToDelete) return;

    deleteGoal.mutate(goalToDelete);
    setGoalToDelete(null);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-400" />
            Goals Organizer
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Organize and track your benchmarks by semester, trimester, or year
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          {completionRate}% success rate
          {goalsQuery.isFetching && (
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
          )}
        </div>
      </div>

      {goalsQuery.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {friendlyErrorMessage(goalsQuery.error, "Couldn't load your goals.")}
        </div>
      )}

      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Define New Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Save €5,000, Read 10 books, Complete machine learning course..."
                disabled={adding}
                className="flex-1"
              />

              <div className="flex gap-2">
                <Select
                  value={timeframe}
                  onValueChange={(value: Timeframe) =>
                    handleTimeframeChange(value)
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="trimester">Trimester</SelectItem>
                    <SelectItem value="year">Full Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={period} onValueChange={(value) => setPeriod(value)}>
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
                    ) : timeframe === "trimester" ? (
                      <>
                        <SelectItem value={`${currentYear}-T1`}>
                          {currentYear} T1
                        </SelectItem>
                        <SelectItem value={`${currentYear}-T2`}>
                          {currentYear} T2
                        </SelectItem>
                        <SelectItem value={`${currentYear}-T3`}>
                          {currentYear} T3
                        </SelectItem>
                        <SelectItem value={`${currentYear + 1}-T1`}>
                          {currentYear + 1} T1
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
              <Button
                type="submit"
                disabled={adding || !newTitle.trim()}
                className="gap-1.5 shadow-lg shadow-violet-900/30"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Goal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {goalsQuery.isLoading ? (
        <div className="space-y-6">
          <Card className="animate-pulse h-40 bg-white/5 rounded-xl border-white/[0.08]" />
          <Card className="animate-pulse h-40 bg-white/5 rounded-xl border-white/[0.08]" />
          <Card className="animate-pulse h-40 bg-white/5 rounded-xl border-white/[0.08]" />
        </div>
      ) : (
        <div className="space-y-6">
          <GoalSection
            title="Semester Goals"
            icon={<Calendar className="w-4 h-4 text-violet-400" />}
            badgeClassName="border-violet-500/30 text-violet-300"
            goals={semesterGoals}
            emptyText="No semester goals added yet"
            periodPrefix="Period"
            deletingId={deletingId}
            onToggle={(goal) => toggleGoal.mutate(goal)}
            onDelete={setGoalToDelete}
          />

          <GoalSection
            title="Trimester Goals"
            icon={<Layers className="w-4 h-4 text-emerald-400" />}
            badgeClassName="border-emerald-500/30 text-emerald-300"
            goals={trimesterGoals}
            emptyText="No trimester goals added yet"
            periodPrefix="Period"
            deletingId={deletingId}
            onToggle={(goal) => toggleGoal.mutate(goal)}
            onDelete={setGoalToDelete}
          />

          <GoalSection
            title="Annual Goals"
            icon={<Target className="w-4 h-4 text-orange-400" />}
            badgeClassName="border-orange-500/30 text-orange-300"
            goals={yearGoals}
            emptyText="No annual goals added yet"
            periodPrefix="Year"
            deletingId={deletingId}
            onToggle={(goal) => toggleGoal.mutate(goal)}
            onDelete={setGoalToDelete}
          />
        </div>
      )}

      <ConfirmDialog
        open={goalToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setGoalToDelete(null);
        }}
        title="Delete goal?"
        description={
          goalToDelete
            ? `"${goalToDelete.title}" will be permanently deleted.`
            : ""
        }
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
