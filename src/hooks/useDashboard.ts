"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import {
  addTransactionToDashboard,
  applyBudgetToDashboard,
  buildDashboardData,
  removeTransactionFromDashboard,
  toBudgetMap,
} from "@/lib/dashboard";
import { ensureMonthReady } from "@/lib/seed";
import { useToast } from "@/lib/toast";
import { friendlyMutationError } from "@/lib/utils";
import type {
  Category,
  CategoryBudget,
  DashboardData,
  Transaction,
} from "@/lib/types";

export interface NewTransactionInput {
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  description: string | null;
  date: string;
  category: Category | null;
}

interface AddTransactionContext {
  previous?: DashboardData;
  tempId: string;
}

interface DeleteTransactionContext {
  previous?: DashboardData;
}

interface BudgetContext {
  previous?: DashboardData;
}

function isMissingTable(error: PostgrestError): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

function isInMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(`${year}-${String(month).padStart(2, "0")}-`);
}

export function useDashboard(year: number, month: number) {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.dashboard(userId, year, month),
    queryFn: () => fetchDashboardData(userId, year, month),
    placeholderData: keepPreviousData,
  });
}

/** Shared by the dashboard query and the month-switch prefetcher. */
export async function fetchDashboardData(
  userId: string,
  year: number,
  month: number
): Promise<DashboardData> {
  const supabase = createClient();
  await ensureMonthReady(userId, year, month);

  const [categoriesResult, transactionsResult, budgetsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .order("date", { ascending: false }),
      supabase
        .from("category_budgets")
        .select("category_id, budget_limit")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month),
    ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }
  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message);
  }
  if (budgetsResult.error) {
    throw new Error(budgetsResult.error.message);
  }

  const budgets = (budgetsResult.data || []) as Pick<
    CategoryBudget,
    "category_id" | "budget_limit"
  >[];

  return buildDashboardData(
    (categoriesResult.data || []) as Category[],
    (transactionsResult.data || []) as Transaction[],
    toBudgetMap(budgets)
  );
}

export function useAddTransaction(year: number, month: number) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.dashboard(userId, year, month);

  return useMutation<
    Transaction,
    Error,
    NewTransactionInput,
    AddTransactionContext
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: input.type,
          amount: input.amount,
          category_id: input.category_id,
          description: input.description,
          date: input.date,
        })
        .select("*, categories(*)")
        .single();

      if (error) throw new Error(error.message);

      return data as Transaction;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DashboardData>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;

      const optimistic: Transaction = {
        id: tempId,
        user_id: userId,
        category_id: input.category_id,
        recurring_transaction_id: null,
        type: input.type,
        amount: input.amount,
        description: input.description,
        date: input.date,
        year,
        month,
        created_at: new Date().toISOString(),
        categories: input.category,
      };

      if (previous && isInMonth(input.date, year, month)) {
        queryClient.setQueryData(
          queryKey,
          addTransactionToDashboard(previous, optimistic)
        );
      }

      return { previous, tempId };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not add transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSuccess: (transaction, input, context) => {
      const current = queryClient.getQueryData<DashboardData>(queryKey);

      if (current && isInMonth(input.date, year, month)) {
        const withoutTemp = context?.tempId
          ? removeTransactionFromDashboard(current, context.tempId)
          : current;

        queryClient.setQueryData(
          queryKey,
          addTransactionToDashboard(withoutTemp, transaction)
        );
      }
    },
    onSettled: (_data, _error, input) => {
      // Optimistic state already covers the current month: mark it stale
      // without refetching. A date in another month needs cache reconciliation.
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      if (!isInMonth(input.date, year, month)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardAll(userId),
          refetchType: "none",
        });
      }
    },
  });
}

export function useDeleteTransaction(year: number, month: number) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.dashboard(userId, year, month);

  return useMutation<void, Error, Transaction, DeleteTransactionContext>({
    mutationFn: async (transaction) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);

      if (!transaction.recurring_transaction_id) return;

      const { error: dismissalError } = await supabase
        .from("recurring_transaction_dismissals")
        .upsert(
          {
            user_id: userId,
            recurring_transaction_id: transaction.recurring_transaction_id,
            year: transaction.year,
            month: transaction.month,
          },
          {
            onConflict: "user_id,recurring_transaction_id,year,month",
          }
        );

      if (dismissalError && !isMissingTable(dismissalError)) {
        throw new Error(dismissalError.message);
      }
    },
    onMutate: async (transaction) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DashboardData>(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          removeTransactionFromDashboard(previous, transaction.id)
        );
      }

      return { previous };
    },
    onError: (error, _transaction, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete transaction",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useSetBudget(year: number, month: number) {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.dashboard(userId, year, month);

  return useMutation<
    void,
    Error,
    { categoryId: string; budgetLimit: number },
    BudgetContext
  >({
    mutationFn: async ({ categoryId, budgetLimit }) => {
      const { error } = await supabase.from("category_budgets").upsert(
        {
          user_id: userId,
          category_id: categoryId,
          year,
          month,
          budget_limit: budgetLimit,
        },
        { onConflict: "user_id,category_id,year,month" }
      );

      if (error) throw new Error(error.message);
    },
    onMutate: async ({ categoryId, budgetLimit }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DashboardData>(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          applyBudgetToDashboard(previous, categoryId, budgetLimit)
        );
      }

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not save budget",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}
