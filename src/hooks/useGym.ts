"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { isMissingFunction } from "@/lib/seed";
import { useToast } from "@/lib/toast";
import { friendlyMutationError } from "@/lib/utils";
import type {
  SaveSessionInput,
  WorkoutDay,
  WorkoutExercise,
  WorkoutSession,
} from "@/lib/types";

export interface GymData {
  days: WorkoutDay[];
  exercises: WorkoutExercise[];
  sessions: WorkoutSession[];
}

interface OptimisticContext {
  previous?: GymData;
  tempId?: string;
}

const seededUsers = new Set<string>();
let daysRpcUnavailable = false;

/** Creates the four default day slots once per user. */
async function ensureWorkoutDays(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return;

  const supabase = createClient();

  if (!daysRpcUnavailable) {
    const { error } = await supabase.rpc("ensure_workout_days");
    if (!error) {
      seededUsers.add(userId);
      return;
    }
    if (!isMissingFunction(error)) throw new Error(error.message);
    daysRpcUnavailable = true;
  }

  const { data, error } = await supabase
    .from("workout_days")
    .select("id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    seededUsers.add(userId);
    return;
  }

  const { error: insertError } = await supabase.from("workout_days").insert(
    [1, 2, 3, 4].map((order) => ({
      user_id: userId,
      name: `Day ${order}`,
      sort_order: order,
    }))
  );

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
  seededUsers.add(userId);
}

export function useGym() {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.gym(userId),
    queryFn: async (): Promise<GymData> => {
      await ensureWorkoutDays(userId);

      const [daysResult, sessionsResult] = await Promise.all([
        supabase
          .from("workout_days")
          .select("*, workout_exercises(*)")
          .eq("user_id", userId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("workout_sessions")
          .select("*, workout_sets(*)")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (daysResult.error) throw new Error(daysResult.error.message);
      if (sessionsResult.error) throw new Error(sessionsResult.error.message);

      const days = (daysResult.data ?? []) as WorkoutDay[];

      return {
        days: days.map((day) => ({
          ...day,
          workout_exercises: [...(day.workout_exercises ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        })),
        exercises: days.flatMap((day) => day.workout_exercises ?? []),
        sessions: (sessionsResult.data ?? []) as WorkoutSession[],
      };
    },
  });
}

export function useRenameWorkoutDay() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.gym(userId);

  return useMutation<
    void,
    Error,
    { id: string; name: string },
    OptimisticContext
  >({
    mutationFn: async ({ id, name }) => {
      const { error } = await supabase
        .from("workout_days")
        .update({ name })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GymData>(queryKey);

      if (previous) {
        queryClient.setQueryData<GymData>(queryKey, {
          ...previous,
          days: previous.days.map((day) =>
            day.id === id ? { ...day, name } : day
          ),
        });
      }

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not rename day",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useAddWorkoutExercise() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.gym(userId);

  return useMutation<
    WorkoutExercise,
    Error,
    { dayId: string; name: string },
    OptimisticContext
  >({
    mutationFn: async ({ dayId, name }) => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .insert({
          user_id: userId,
          workout_day_id: dayId,
          name,
          sort_order: 0,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as WorkoutExercise;
    },
    onMutate: async ({ dayId, name }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GymData>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const optimistic: WorkoutExercise = {
        id: tempId,
        user_id: userId,
        workout_day_id: dayId,
        name,
        sort_order: -1,
        created_at: new Date().toISOString(),
      };

      if (previous) {
        queryClient.setQueryData<GymData>(queryKey, {
          ...previous,
          exercises: [...previous.exercises, optimistic],
          days: previous.days.map((day) =>
            day.id === dayId
              ? {
                  ...day,
                  workout_exercises: [
                    optimistic,
                    ...(day.workout_exercises ?? []),
                  ],
                }
              : day
          ),
        });
      }

      return { previous, tempId };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not add exercise",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSuccess: (exercise, _input, context) => {
      queryClient.setQueryData<GymData>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          exercises: [
            ...current.exercises.filter((item) => item.id !== context?.tempId),
            exercise,
          ],
          days: current.days.map((day) => ({
            ...day,
            workout_exercises: (day.workout_exercises ?? []).map((item) =>
              item.id === context?.tempId ? exercise : item
            ),
          })),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useDeleteWorkoutExercise() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.gym(userId);

  return useMutation<void, Error, WorkoutExercise, OptimisticContext>({
    mutationFn: async (exercise) => {
      const { error } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("id", exercise.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (exercise) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GymData>(queryKey);

      if (previous) {
        queryClient.setQueryData<GymData>(queryKey, {
          ...previous,
          exercises: previous.exercises.filter((item) => item.id !== exercise.id),
          days: previous.days.map((day) => ({
            ...day,
            workout_exercises: (day.workout_exercises ?? []).filter(
              (item) => item.id !== exercise.id
            ),
          })),
        });
      }

      return { previous };
    },
    onError: (error, _exercise, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not delete exercise",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useSaveWorkoutSession() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.gym(userId);

  return useMutation<WorkoutSession, Error, SaveSessionInput, OptimisticContext>(
    {
      mutationFn: async (input) => {
        const payload = input.sets.map((set) => ({
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
        }));

        const { data: rpcId, error } = await supabase.rpc(
          "save_workout_session",
          {
            p_day_id: input.dayId,
            p_date: input.date,
            p_notes: input.notes,
            p_sets: payload,
          }
        );

        let sessionId = rpcId as string | null;

        if (error) {
          if (!isMissingFunction(error)) throw new Error(error.message);

          // Fallback for databases without the atomic RPC.
          const { data: inserted, error: insertError } = await supabase
            .from("workout_sessions")
            .insert({
              user_id: userId,
              workout_day_id: input.dayId,
              date: input.date,
              notes: input.notes,
            })
            .select("*")
            .single();

          if (insertError) throw new Error(insertError.message);
          sessionId = inserted.id;

          if (payload.length > 0) {
            const { error: setsError } = await supabase
              .from("workout_sets")
              .insert(
                payload.map((set) => ({
                  user_id: userId,
                  session_id: sessionId,
                  exercise_id: set.exercise_id,
                  set_number: set.set_number,
                  weight: set.weight,
                  reps: set.reps,
                }))
              );

            if (setsError) throw new Error(setsError.message);
          }
        }

        if (!sessionId) throw new Error("Could not save workout");

        const { data: saved, error: fetchError } = await supabase
          .from("workout_sessions")
          .select("*, workout_sets(*)")
          .eq("id", sessionId)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        return saved as WorkoutSession;
      },
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<GymData>(queryKey);
        const tempId = `optimistic-${Date.now()}-${Math.random()}`;
        const now = new Date().toISOString();

        const optimistic: WorkoutSession = {
          id: tempId,
          user_id: userId,
          workout_day_id: input.dayId,
          date: input.date,
          notes: input.notes,
          created_at: now,
          workout_sets: input.sets.map((set, index) => ({
            id: `temp-set-${tempId}-${index}`,
            user_id: userId,
            session_id: tempId,
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            created_at: now,
          })),
        };

        if (previous) {
          const sessions = [...previous.sessions];
          const position = sessions.findIndex((session) => session.date <= input.date);
          sessions.splice(position === -1 ? sessions.length : position, 0, optimistic);

          queryClient.setQueryData<GymData>(queryKey, {
            ...previous,
            sessions,
          });
        }

        return { previous, tempId };
      },
      onError: (error, _input, context) => {
        if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
        toast({
          title: "Could not save workout",
          description: friendlyMutationError(error),
          variant: "error",
        });
      },
      onSuccess: (session, _input, context) => {
        queryClient.setQueryData<GymData>(queryKey, (current) => {
          if (!current) return current;
          return {
            ...current,
            sessions: current.sessions.map((item) =>
              item.id === context?.tempId ? session : item
            ),
          };
        });
        toast({
          title: "Workout saved",
          description: "Your sets are logged. Keep it up!",
          variant: "success",
        });
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      },
    }
  );
}

export function useDeleteWorkoutSession() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.gym(userId);

  return useMutation<void, Error, WorkoutSession, OptimisticContext>({
    mutationFn: async (session) => {
      const { error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", session.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (session) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GymData>(queryKey);

      if (previous) {
        queryClient.setQueryData<GymData>(queryKey, {
          ...previous,
          sessions: previous.sessions.filter((item) => item.id !== session.id),
        });
      }

      return { previous };
    },
    onError: (error, _session, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not delete workout",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}
