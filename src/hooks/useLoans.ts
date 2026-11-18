"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { isMissingFunction } from "@/lib/seed";
import { useToast } from "@/lib/toast";
import { formatCurrency, friendlyMutationError } from "@/lib/utils";
import type { Loan, LoanRepayment } from "@/lib/types";

interface OptimisticContext {
  previous?: Loan[];
  tempId?: string;
}

export function useLoans() {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.loans(userId),
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []) as Loan[];
    },
  });
}

export interface NewLoanInput {
  borrower_name: string;
  original_amount: number;
  description: string | null;
  date_lent: string;
  due_date: string | null;
}

export function useAddLoan() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.loans(userId);

  return useMutation<Loan, Error, NewLoanInput, OptimisticContext>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("loans")
        .insert({
          user_id: userId,
          borrower_name: input.borrower_name,
          original_amount: input.original_amount,
          description: input.description,
          date_lent: input.date_lent,
          due_date: input.due_date,
          status: "active",
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Loan;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Loan[]>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;

      const now = new Date().toISOString();

      if (previous) {
        queryClient.setQueryData<Loan[]>(queryKey, [
          {
            id: tempId,
            user_id: userId,
            borrower_name: input.borrower_name,
            original_amount: input.original_amount,
            amount_repaid: 0,
            description: input.description,
            date_lent: input.date_lent,
            due_date: input.due_date,
            status: "active",
            created_at: now,
            updated_at: now,
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
        title: "Could not add loan",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSuccess: (loan, _input, context) => {
      queryClient.setQueryData<Loan[]>(queryKey, (current = []) => [
        loan,
        ...current.filter((item) => item.id !== context?.tempId),
      ]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

interface RepaymentInput {
  loan: Loan;
  amount: number;
  date: string;
  notes: string | null;
}

interface RepaymentContext {
  previous?: Loan[];
  clamped: number;
}

export function useRecordRepayment() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loansKey = queryKeys.loans(userId);

  return useMutation<number, Error, RepaymentInput, RepaymentContext>({
    mutationFn: async ({ loan, amount, date, notes }) => {
      const rpcResult = await supabase.rpc("record_loan_repayment", {
        p_loan_id: loan.id,
        p_amount: amount,
        p_date: date,
        p_notes: notes,
      });

      if (!rpcResult.error) {
        return Number(rpcResult.data);
      }

      if (!isMissingFunction(rpcResult.error)) {
        throw new Error(rpcResult.error.message);
      }

      const outstanding = loan.original_amount - loan.amount_repaid;
      const clamped = Math.min(amount, outstanding);

      if (clamped <= 0) throw new Error("Loan is already settled");

      const { error: repaymentError } = await supabase
        .from("loan_repayments")
        .insert({
          loan_id: loan.id,
          user_id: userId,
          amount: clamped,
          date,
          notes,
        });

      if (repaymentError) throw new Error(repaymentError.message);

      const newRepaid = loan.amount_repaid + clamped;

      const { error: loanError } = await supabase
        .from("loans")
        .update({
          amount_repaid: newRepaid,
          status: newRepaid >= loan.original_amount ? "repaid" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", loan.id)
        .eq("user_id", userId);

      if (loanError) throw new Error(loanError.message);

      return clamped;
    },
    onMutate: async ({ loan, amount }) => {
      await queryClient.cancelQueries({ queryKey: loansKey });
      const previous = queryClient.getQueryData<Loan[]>(loansKey);
      const outstanding = loan.original_amount - loan.amount_repaid;
      const clamped = Math.max(0, Math.min(amount, outstanding));

      queryClient.setQueryData<Loan[]>(loansKey, (current = []) =>
        current.map((item) => {
          if (item.id !== loan.id) return item;

          const newRepaid = item.amount_repaid + clamped;

          return {
            ...item,
            amount_repaid: newRepaid,
            status:
              newRepaid >= item.original_amount ? "repaid" : item.status,
            updated_at: new Date().toISOString(),
          };
        })
      );

      return { previous, clamped };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(loansKey, context.previous);
      }
      toast({
        title: "Could not record repayment",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSuccess: (_clamped, input, context) => {
      toast({
        title: "Repayment recorded",
        description: `${formatCurrency(
          context?.clamped ?? input.amount
        )} added to ${input.loan.borrower_name}'s loan.`,
        variant: "success",
      });
    },
    onSettled: () => {
      // The optimistic balance is authoritative. The repayment list has no
      // optimistic update, so that query still refetches normally.
      void queryClient.invalidateQueries({
        queryKey: loansKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.loanRepayments(userId),
      });
    },
  });
}

export function useForgiveLoan() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.loans(userId);

  return useMutation<void, Error, Loan, OptimisticContext>({
    mutationFn: async (loan) => {
      const { error } = await supabase
        .from("loans")
        .update({ status: "forgiven", updated_at: new Date().toISOString() })
        .eq("id", loan.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (loan) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Loan[]>(queryKey);

      queryClient.setQueryData<Loan[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === loan.id ? { ...item, status: "forgiven" } : item
        )
      );

      return { previous };
    },
    onError: (error, _loan, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not update loan",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useDeleteLoan() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.loans(userId);

  return useMutation<void, Error, Loan, OptimisticContext>({
    mutationFn: async (loan) => {
      const { error } = await supabase
        .from("loans")
        .delete()
        .eq("id", loan.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (loan) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Loan[]>(queryKey);

      queryClient.setQueryData<Loan[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== loan.id)
      );

      return { previous };
    },
    onError: (error, _loan, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete loan",
        description: friendlyMutationError(error),
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

/** One query for every repayment, shared by all expanded loan cards. */
export function useAllLoanRepayments(enabled = true) {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.loanRepayments(userId),
    enabled,
    queryFn: async (): Promise<LoanRepayment[]> => {
      const { data, error } = await supabase
        .from("loan_repayments")
        .select("id,loan_id,user_id,amount,date,notes,created_at")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []) as LoanRepayment[];
    },
  });
}
