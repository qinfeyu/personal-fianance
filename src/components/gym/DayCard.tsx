"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionHistory } from "@/components/gym/SessionHistory";
import { formatSetLine, summarizeExercise } from "@/lib/gym";
import type {
  WorkoutDay,
  WorkoutExercise,
  WorkoutSession,
} from "@/lib/types";
import { formatWeight } from "@/lib/utils";

interface DayCardProps {
  index: number;
  day: WorkoutDay;
  exercises: WorkoutExercise[];
  sessions: WorkoutSession[];
  addingExercise: boolean;
  deletingSessionId?: string;
  onRename: (id: string, name: string) => void;
  onAddExercise: (dayId: string, name: string) => void;
  onDeleteExercise: (exercise: WorkoutExercise) => void;
  onDeleteSession: (session: WorkoutSession) => void;
  onLog: (day: WorkoutDay) => void;
}

export function DayCard({
  index,
  day,
  exercises,
  sessions,
  addingExercise,
  deletingSessionId,
  onRename,
  onAddExercise,
  onDeleteExercise,
  onDeleteSession,
  onLog,
}: DayCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(day.name);
  const [newExercise, setNewExercise] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  function commitName() {
    const next = nameDraft.trim();
    if (next && next !== day.name) onRename(day.id, next);
    if (!next) setNameDraft(day.name);
    setEditingName(false);
  }

  function addExercise(event: React.FormEvent) {
    event.preventDefault();
    const name = newExercise.trim();
    if (!name) return;
    onAddExercise(day.id, name);
    setNewExercise("");
  }

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500/15 text-violet-300 text-[11px] font-bold flex-shrink-0">
                {index}
              </span>
              {editingName ? (
                <Input
                  autoFocus
                  value={nameDraft}
                  maxLength={40}
                  aria-label={`Name for day ${index}`}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitName();
                    if (event.key === "Escape") {
                      setNameDraft(day.name);
                      setEditingName(false);
                    }
                  }}
                  className="h-7 text-sm py-0"
                />
              ) : (
                <CardTitle className="text-base flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{day.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(day.name);
                      setEditingName(true);
                    }}
                    className="p-1 text-white/20 hover:text-violet-300 transition-colors flex-shrink-0"
                    aria-label={`Rename ${day.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </CardTitle>
              )}
            </div>
            <p className="text-[10px] text-white/30 mt-1.5">
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"} ·{" "}
              {sessions.length} session{sessions.length === 1 ? "" : "s"}
            </p>
          </div>

          <Button
            size="sm"
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={() => onLog(day)}
            disabled={exercises.length === 0}
          >
            <Dumbbell className="w-3 h-3" />
            Log
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-1">
        {exercises.length === 0 ? (
          <p className="text-xs text-white/30 italic py-2">
            No exercises yet — add one below.
          </p>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise) => {
              const summary = summarizeExercise(sessions, exercise.id);
              return (
                <div
                  key={exercise.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white/90 min-w-0">
                      {exercise.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => onDeleteExercise(exercise)}
                      className="p-1 text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                      aria-label={`Delete ${exercise.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {summary.lastSets.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[11px] text-emerald-400/80">
                        {formatSetLine(summary.lastSets)}
                      </p>
                      <p className="text-[10px] text-white/30">
                        Best {summary.bestSet ? formatWeight(summary.bestSet.weight) : "—"} ·{" "}
                        {summary.sessionCount} workout
                        {summary.sessionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/25 mt-0.5">
                      Not logged yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={addExercise} className="flex gap-2">
          <Input
            value={newExercise}
            onChange={(event) => setNewExercise(event.target.value)}
            placeholder="Add exercise (e.g. Bench Press)"
            aria-label={`New exercise for ${day.name}`}
            maxLength={60}
            className="h-8 text-xs"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 flex-shrink-0"
            disabled={!newExercise.trim() || addingExercise}
            aria-label={`Add exercise to ${day.name}`}
          >
            {addingExercise ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </Button>
        </form>

        <div className="border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors w-full"
            aria-expanded={showHistory}
          >
            <History className="w-3.5 h-3.5" />
            History ({sessions.length})
            {showHistory ? (
              <ChevronUp className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-auto" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2">
              <SessionHistory
                sessions={sessions}
                exercises={exercises}
                deletingId={deletingSessionId}
                onDelete={onDeleteSession}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
