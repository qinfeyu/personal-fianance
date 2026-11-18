import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { formatWeight } from "@/lib/utils";

export interface ExerciseSummary {
  lastSets: WorkoutSet[];
  bestSet: WorkoutSet | null;
  sessionCount: number;
}

/** Summarizes an exercise across sessions assumed to be newest-first. */
export function summarizeExercise(
  sessions: WorkoutSession[],
  exerciseId: string
): ExerciseSummary {
  let lastSets: WorkoutSet[] = [];
  let bestSet: WorkoutSet | null = null;
  let sessionCount = 0;

  for (const session of sessions) {
    const sets = (session.workout_sets ?? []).filter(
      (set) => set.exercise_id === exerciseId
    );
    if (sets.length === 0) continue;

    if (sessionCount === 0) {
      lastSets = [...sets].sort((a, b) => a.set_number - b.set_number);
    }
    sessionCount += 1;

    for (const set of sets) {
      if (!bestSet || set.weight > bestSet.weight) bestSet = set;
    }
  }

  return { lastSets, bestSet, sessionCount };
}

export function formatSetLine(sets: WorkoutSet[]): string {
  return sets
    .map((set) => `${formatWeight(set.weight)} × ${set.reps}`)
    .join("  ·  ");
}
