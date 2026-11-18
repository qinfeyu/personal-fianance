"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/lib/toast";
import type { Goal } from "@/lib/types";

export interface NewGoalInput {
  title: string;
  timeframe: Goal["timeframe"];
  period: string;
}

interface OptimisticContext {
  previous?: Goal[];
  tempId?: string;
}

export function useGoals() {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.goals(userId),
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []) as Goal[];
    },
  });
}

export function useAddGoal() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.goals(userId);

  return useMutation<Goal, Error, NewGoalInput, OptimisticContext>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          title: input.title,
          timeframe: input.timeframe,
          period: input.period,
          completed: false,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Goal;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Goal[]>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;

      if (previous) {
        queryClient.setQueryData<Goal[]>(queryKey, [
          {
            id: tempId,
            user_id: userId,
            title: input.title,
            timeframe: input.timeframe,
            period: input.period,
            completed: false,
            created_at: new Date().toISOString(),
          },
          ...previous,
        ]);
      }

      return { previous, tempId };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not add goal",
        description: error.message,
        variant: "error",
      });
    },
    onSuccess: (goal, _input, context) => {
      queryClient.setQueryData<Goal[]>(queryKey, (current = []) => [
        goal,
        ...current.filter((item) => item.id !== context?.tempId),
      ]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useToggleGoal() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.goals(userId);

  return useMutation<Goal, Error, Goal, OptimisticContext>({
    mutationFn: async (goal) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ completed: !goal.completed })
        .eq("id", goal.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Goal;
    },
    onMutate: async (goal) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Goal[]>(queryKey);

      queryClient.setQueryData<Goal[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === goal.id ? { ...item, completed: !item.completed } : item
        )
      );

      return { previous };
    },
    onError: (error, _goal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not update goal",
        description: error.message,
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useDeleteGoal() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.goals(userId);

  return useMutation<void, Error, Goal, OptimisticContext>({
    mutationFn: async (goal) => {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goal.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (goal) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Goal[]>(queryKey);

      queryClient.setQueryData<Goal[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== goal.id)
      );

      return { previous };
    },
    onError: (error, _goal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete goal",
        description: error.message,
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}
