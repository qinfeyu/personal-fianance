"use client";

import { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DayCard } from "@/components/gym/DayCard";
import { LogWorkoutModal } from "@/components/gym/LogWorkoutModal";
import {
  useAddWorkoutExercise,
  useDeleteWorkoutExercise,
  useDeleteWorkoutSession,
  useGym,
  useRenameWorkoutDay,
  useSaveWorkoutSession,
} from "@/hooks/useGym";
import type {
  WorkoutDay,
  WorkoutExercise,
  WorkoutSession,
} from "@/lib/types";
import { friendlyErrorMessage } from "@/lib/utils";

export default function GymPage() {
  const gymQuery = useGym();
  const renameDay = useRenameWorkoutDay();
  const addExercise = useAddWorkoutExercise();
  const deleteExercise = useDeleteWorkoutExercise();
  const saveSession = useSaveWorkoutSession();
  const deleteSession = useDeleteWorkoutSession();

  const [logDay, setLogDay] = useState<WorkoutDay | null>(null);
  const [exerciseToDelete, setExerciseToDelete] =
    useState<WorkoutExercise | null>(null);
  const [sessionToDelete, setSessionToDelete] =
    useState<WorkoutSession | null>(null);

  const days = useMemo(() => gymQuery.data?.days ?? [], [gymQuery.data?.days]);
  const exercises = useMemo(
    () => gymQuery.data?.exercises ?? [],
    [gymQuery.data?.exercises]
  );
  const sessions = useMemo(
    () => gymQuery.data?.sessions ?? [],
    [gymQuery.data?.sessions]
  );

  const exercisesByDay = useMemo(() => {
    const map = new Map<string, WorkoutExercise[]>();
    for (const exercise of exercises) {
      const list = map.get(exercise.workout_day_id) ?? [];
      list.push(exercise);
      map.set(exercise.workout_day_id, list);
    }
    return map;
  }, [exercises]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const session of sessions) {
      const list = map.get(session.workout_day_id) ?? [];
      list.push(session);
      map.set(session.workout_day_id, list);
    }
    return map;
  }, [sessions]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-violet-400" />
          Gym Log
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          Four training days · track every set in kilograms
        </p>
      </div>

      {gymQuery.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm" role="alert">
          {friendlyErrorMessage(gymQuery.error, "Couldn't load your gym log.")}
        </div>
      )}

      {gymQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="h-72 animate-pulse bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {days.map((day, index) => (
            <DayCard
              key={day.id}
              index={index + 1}
              day={day}
              exercises={exercisesByDay.get(day.id) ?? []}
              sessions={sessionsByDay.get(day.id) ?? []}
              addingExercise={addExercise.isPending}
              deletingSessionId={
                deleteSession.isPending ? deleteSession.variables?.id : undefined
              }
              onRename={(id, name) => renameDay.mutate({ id, name })}
              onAddExercise={(dayId, name) =>
                addExercise.mutate({ dayId, name })
              }
              onDeleteExercise={setExerciseToDelete}
              onDeleteSession={setSessionToDelete}
              onLog={setLogDay}
            />
          ))}
        </div>
      )}

      {logDay && (
        <LogWorkoutModal
          key={logDay.id}
          open
          onOpenChange={(open) => {
            if (!open) setLogDay(null);
          }}
          day={logDay}
          exercises={exercisesByDay.get(logDay.id) ?? []}
          saving={saveSession.isPending}
          onSave={(input) => {
            saveSession.mutate(input, {
              onSuccess: () => setLogDay(null),
            });
          }}
        />
      )}

      <ConfirmDialog
        open={exerciseToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setExerciseToDelete(null);
        }}
        title="Delete exercise?"
        description={
          exerciseToDelete
            ? `"${exerciseToDelete.name}" will be removed from ${
                days.find((day) => day.id === exerciseToDelete.workout_day_id)
                  ?.name ?? "this day"
              }. Past sets stay in your workout history.`
            : ""
        }
        onConfirm={() => {
          if (exerciseToDelete) deleteExercise.mutate(exerciseToDelete);
          setExerciseToDelete(null);
        }}
      />

      <ConfirmDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
        title="Delete workout?"
        description="This session and all of its sets will be permanently deleted."
        onConfirm={() => {
          if (sessionToDelete) deleteSession.mutate(sessionToDelete);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
