"use client";

import { useState } from "react";
import { Dumbbell, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SaveSessionInput,
  WorkoutDay,
  WorkoutExercise,
} from "@/lib/types";
import { getTodayLocal } from "@/lib/utils";

interface DraftSet {
  key: string;
  weight: string;
  reps: string;
}

interface LogWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: WorkoutDay;
  exercises: WorkoutExercise[];
  saving: boolean;
  onSave: (input: SaveSessionInput) => void;
}

let rowCounter = 0;
function newRow(): DraftSet {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, weight: "", reps: "" };
}

export function LogWorkoutModal({
  open,
  onOpenChange,
  day,
  exercises,
  saving,
  onSave,
}: LogWorkoutModalProps) {
  const [date, setDate] = useState(getTodayLocal());
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Record<string, DraftSet[]>>(() =>
    Object.fromEntries(exercises.map((exercise) => [exercise.id, [newRow()]]))
  );
  const [error, setError] = useState<string | null>(null);

  function updateRow(
    exerciseId: string,
    key: string,
    field: "weight" | "reps",
    value: string
  ) {
    setRows((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((row) =>
        row.key === key ? { ...row, [field]: value } : row
      ),
    }));
  }

  function addRow(exerciseId: string) {
    setRows((current) => ({
      ...current,
      [exerciseId]: [...(current[exerciseId] ?? []), newRow()],
    }));
  }

  function removeRow(exerciseId: string, key: string) {
    setRows((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).filter((row) => row.key !== key),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (exercises.length === 0) {
      setError("Add an exercise to this day first.");
      return;
    }

    const sets: SaveSessionInput["sets"] = [];

    for (const exercise of exercises) {
      const exerciseRows = rows[exercise.id] ?? [];
      let setNumber = 0;

      for (const row of exerciseRows) {
        if (row.weight.trim() === "" && row.reps.trim() === "") continue;

        if (row.weight.trim() === "" || row.reps.trim() === "") {
          setError("Fill in both weight and reps for every set you started.");
          return;
        }

        const weight = Number(row.weight.replace(",", "."));
        const reps = Number(row.reps);

        if (!Number.isFinite(weight) || weight < 0) {
          setError("Enter a valid weight in kilograms.");
          return;
        }
        if (!Number.isInteger(reps) || reps < 1) {
          setError("Reps must be a whole number greater than 0.");
          return;
        }

        setNumber += 1;
        sets.push({
          exercise_id: exercise.id,
          set_number: setNumber,
          weight,
          reps,
        });
      }
    }

    if (sets.length === 0) {
      setError("Add at least one set with a weight and reps.");
      return;
    }

    onSave({ dayId: day.id, date, notes: notes.trim() || null, sets });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-violet-400" />
          Log workout — {day.name}
        </DialogTitle>
        <DialogDescription>
          Record the weight (kg) and reps for each set.
        </DialogDescription>
      </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="workout-date">Date</Label>
            <Input
              id="workout-date"
              type="date"
              value={date}
              max={getTodayLocal()}
              onChange={(event) => setDate(event.target.value)}
              className="[color-scheme:dark]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workout-notes">Notes (optional)</Label>
            <Input
              id="workout-notes"
              value={notes}
              maxLength={200}
              placeholder="Felt strong, new PR…"
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2"
            >
              <p className="text-sm font-semibold text-white/90">
                {exercise.name}
              </p>

              <div className="hidden sm:grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wide text-white/30 px-0.5">
                <span>Set</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span />
              </div>

              {(rows[exercise.id] ?? []).map((row, index) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center"
                >
                  <span className="text-xs text-white/40 text-center">
                    {index + 1}
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="60"
                    value={row.weight}
                    aria-label={`Weight in kg for set ${index + 1} of ${exercise.name}`}
                    onChange={(event) =>
                      updateRow(exercise.id, row.key, "weight", event.target.value)
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    placeholder="8"
                    value={row.reps}
                    aria-label={`Reps for set ${index + 1} of ${exercise.name}`}
                    onChange={(event) =>
                      updateRow(exercise.id, row.key, "reps", event.target.value)
                    }
                    className="h-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(exercise.id, row.key)}
                    className="p-1.5 text-white/25 hover:text-red-400 transition-colors"
                    aria-label={`Remove set ${index + 1} of ${exercise.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-violet-300"
                onClick={() => addRow(exercise.id)}
              >
                <Plus className="w-3 h-3" />
                Add set
              </Button>
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save workout
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
