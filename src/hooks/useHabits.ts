"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/lib/toast";
import type { Habit, HabitLog } from "@/lib/types";

export interface HabitsWeek {
  habits: Habit[];
  logs: HabitLog[];
}

interface OptimisticContext {
  previous?: HabitsWeek;
  tempId?: string;
}

export function useHabits(start: string, end: string) {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.habits(userId, start, end),
    queryFn: async (): Promise<HabitsWeek> => {
      const [habitsResult, logsResult] = await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("habit_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("date", start)
          .lte("date", end),
      ]);

      if (habitsResult.error) {
        throw new Error(habitsResult.error.message);
      }
      if (logsResult.error) {
        throw new Error(logsResult.error.message);
      }

      return {
        habits: (habitsResult.data || []) as Habit[],
        logs: (logsResult.data || []) as HabitLog[],
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useAddHabit(start: string, end: string) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.habits(userId, start, end);

  return useMutation<Habit, Error, string, OptimisticContext>({
    mutationFn: async (name) => {
      const { data, error } = await supabase
        .from("habits")
        .insert({ user_id: userId, name })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Habit;
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitsWeek>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;

      if (previous) {
        queryClient.setQueryData<HabitsWeek>(queryKey, {
          ...previous,
          habits: [
            ...previous.habits,
            {
              id: tempId,
              user_id: userId,
              name,
              description: null,
              created_at: new Date().toISOString(),
            },
          ],
        });
      }

      return { previous, tempId };
    },
    onError: (error, _name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not add habit",
        description: error.message,
        variant: "error",
      });
    },
    onSuccess: (habit, _name, context) => {
      queryClient.setQueryData<HabitsWeek>(queryKey, (current) => {
        if (!current) return current;

        return {
          ...current,
          habits: [
            ...current.habits.filter((item) => item.id !== context?.tempId),
            habit,
          ],
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useDeleteHabit(start: string, end: string) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.habits(userId, start, end);

  return useMutation<void, Error, Habit, OptimisticContext>({
    mutationFn: async (habit) => {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habit.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (habit) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitsWeek>(queryKey);

      if (previous) {
        queryClient.setQueryData<HabitsWeek>(queryKey, {
          habits: previous.habits.filter((item) => item.id !== habit.id),
          logs: previous.logs.filter((log) => log.habit_id !== habit.id),
        });
      }

      return { previous };
    },
    onError: (error, _habit, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete habit",
        description: error.message,
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

interface ToggleHabitInput {
  habitId: string;
  date: string;
  existingLog?: HabitLog;
}

export function useToggleHabit(start: string, end: string) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.habits(userId, start, end);

  return useMutation<HabitLog | null, Error, ToggleHabitInput, OptimisticContext>(
    {
      mutationFn: async ({ habitId, date, existingLog }) => {
        if (existingLog) {
          const { error } = await supabase
            .from("habit_logs")
            .delete()
            .eq("id", existingLog.id)
            .eq("user_id", userId);

          if (error) throw new Error(error.message);

          return null;
        }

        const { data, error } = await supabase
          .from("habit_logs")
          .insert({
            habit_id: habitId,
            user_id: userId,
            date,
            completed: true,
          })
          .select("*")
          .single();

        if (error) throw new Error(error.message);

        return data as HabitLog;
      },
      onMutate: async ({ habitId, date, existingLog }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<HabitsWeek>(queryKey);
        const tempId = `optimistic-${Date.now()}-${Math.random()}`;

        if (previous) {
          queryClient.setQueryData<HabitsWeek>(queryKey, {
            ...previous,
            logs: existingLog
              ? previous.logs.filter((log) => log.id !== existingLog.id)
              : [
                  ...previous.logs,
                  {
                    id: tempId,
                    habit_id: habitId,
                    user_id: userId,
                    date,
                    completed: true,
                    created_at: new Date().toISOString(),
                  },
                ],
          });
        }

        return { previous, tempId };
      },
      onError: (error, _input, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
        toast({
          title: "Could not update habit",
          description: error.message,
          variant: "error",
        });
      },
      onSuccess: (log, _input, context) => {
        if (!log) return;

        queryClient.setQueryData<HabitsWeek>(queryKey, (current) => {
          if (!current) return current;

          return {
            ...current,
            logs: [
              ...current.logs.filter(
                (item) => item.id !== context?.tempId
              ),
              log,
            ],
          };
        });
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      },
    }
  );
}
