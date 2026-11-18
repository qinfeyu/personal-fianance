"use client";

import { Trash2 } from "lucide-react";
import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";
import { formatDate, formatWeight } from "@/lib/utils";

interface SessionHistoryProps {
  sessions: WorkoutSession[];
  exercises: WorkoutExercise[];
  deletingId?: string;
  onDelete: (session: WorkoutSession) => void;
}

export function SessionHistory({
  sessions,
  exercises,
  deletingId,
  onDelete,
}: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-xs text-white/30 italic py-2">No workouts logged yet.</p>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {sessions.map((session) => {
        const sets = session.workout_sets ?? [];
        const groups = new Map<string, { name: string; sets: WorkoutSet[] }>();

        for (const set of sets) {
          const key = set.exercise_id ?? "__removed__";
          const name = exercises.find((item) => item.id === set.exercise_id)?.name;
          const group = groups.get(key) ?? {
            name: name ?? "Removed exercise",
            sets: [],
          };
          group.sets.push(set);
          groups.set(key, group);
        }

        return (
          <div
            key={session.id}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80">
                  {formatDate(session.date)}
                </p>
                {session.notes && (
                  <p className="text-[10px] text-white/35 truncate">
                    {session.notes}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDelete(session)}
                disabled={deletingId === session.id}
                className="p-1 text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                aria-label={`Delete workout from ${formatDate(session.date)}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-1.5 space-y-1">
              {Array.from(groups.values()).map((group) => (
                <div key={group.name} className="text-[11px]">
                  <span className="text-white/60">{group.name}: </span>
                  <span className="text-emerald-400/90">
                    {[...group.sets]
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((set) => `${formatWeight(set.weight)} × ${set.reps}`)
                      .join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
