"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { clearMonthReady } from "@/lib/seed";
import { useToast } from "@/lib/toast";
import type { RecurringTransaction } from "@/lib/types";
import { friendlyMutationError } from "@/lib/utils";

export interface RecurringInput {
  category_id: string;
  description: string | null;
  amount: number;
  day_of_month: number;
}

interface OptimisticContext {
  previous?: RecurringTransaction[];
  tempId?: string;
}

export function useRecurring(enabled: boolean) {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.recurring(userId),
    enabled,
    queryFn: async (): Promise<RecurringTransaction[]> => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      return (data || []) as RecurringTransaction[];
    },
  });
}

export function useAddRecurring() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.recurring(userId);

  return useMutation<
    RecurringTransaction,
    Error,
    RecurringInput,
    OptimisticContext
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert({ ...input, user_id: userId })
        .select("*, categories(*)")
        .single();

      if (error) throw new Error(error.message);

      return data as RecurringTransaction;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecurringTransaction[]>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;
      const now = new Date().toISOString();

      if (previous) {
        queryClient.setQueryData<RecurringTransaction[]>(queryKey, [
          ...previous,
          {
            id: tempId,
            user_id: userId,
            category_id: input.category_id,
            description: input.description,
            amount: input.amount,
            day_of_month: input.day_of_month,
            active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      return { previous, tempId };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not add recurring transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSuccess: (item, _input, context) => {
      queryClient.setQueryData<RecurringTransaction[]>(queryKey, (current = []) => [
        ...current.filter((row) => row.id !== context?.tempId),
        item,
      ]);
    },
    onSettled: () => {
      // A template change can materialize new rows in every month.
      clearMonthReady(userId);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardAll(userId),
      });
    },
  });
}

export function useUpdateRecurring() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.recurring(userId);

  return useMutation<
    void,
    Error,
    { id: string } & RecurringInput,
    OptimisticContext
  >({
    mutationFn: async ({ id, ...input }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecurringTransaction[]>(queryKey);

      queryClient.setQueryData<RecurringTransaction[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === id ? { ...item, ...input } : item
        )
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not update recurring transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      // A template change can materialize new rows in every month.
      clearMonthReady(userId);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardAll(userId),
      });
    },
  });
}

export function useToggleRecurring() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.recurring(userId);

  return useMutation<void, Error, RecurringTransaction, OptimisticContext>({
    mutationFn: async (item) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ active: !item.active, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecurringTransaction[]>(queryKey);

      queryClient.setQueryData<RecurringTransaction[]>(queryKey, (current = []) =>
        current.map((row) =>
          row.id === item.id ? { ...row, active: !row.active } : row
        )
      );

      return { previous };
    },
    onError: (error, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not update recurring transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      // A template change can materialize new rows in every month.
      clearMonthReady(userId);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardAll(userId),
      });
    },
  });
}

export function useDeleteRecurring() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.recurring(userId);

  return useMutation<void, Error, RecurringTransaction, OptimisticContext>({
    mutationFn: async (item) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", item.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecurringTransaction[]>(queryKey);

      queryClient.setQueryData<RecurringTransaction[]>(queryKey, (current = []) =>
        current.filter((row) => row.id !== item.id)
      );

      return { previous };
    },
    onError: (error, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete recurring transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      // A template change can materialize new rows in every month.
      clearMonthReady(userId);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardAll(userId),
      });
    },
  });
}
