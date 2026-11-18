"use client";

import { useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type Transaction } from "@/lib/types";
import { useDeleteTransaction } from "@/hooks/useDashboard";

interface TransactionListProps {
  transactions: Transaction[];
  year: number;
  month: number;
  loading?: boolean;
}

export function TransactionList({
  transactions,
  year,
  month,
  loading,
}: TransactionListProps) {
  const deleteTransaction = useDeleteTransaction(year, month);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-white/10 rounded w-40" />
                <div className="h-3 bg-white/10 rounded w-24" />
              </div>
              <div className="h-4 bg-white/10 rounded w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card id="transaction-list-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Transactions
            <span className="text-white/40 font-normal text-xs ml-2">
              ({transactions.length})
            </span>
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {transactions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-3xl">📭</p>
            <p className="text-white/40 text-sm">No transactions this month</p>
            <p className="text-white/25 text-xs">
              Click &quot;Add Transaction&quot; to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const isIncome = tx.type === "income";
              const category = tx.categories;
              const isDeleting =
                deleteTransaction.isPending &&
                deleteTransaction.variables?.id === tx.id;

              return (
                <div
                  key={tx.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150"
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                      isIncome
                        ? "bg-emerald-500/15"
                        : "bg-white/5"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : category ? (
                      <span>{category.icon}</span>
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  {/* Description & category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">
                      {tx.description || (isIncome ? "Income" : "Expense")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {category && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: category.color + "22",
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                      {tx.recurring_transaction_id && (
                        <span className="text-[10px] text-violet-400/70 flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" />
                          recurring
                        </span>
                      )}
                      <span className="text-[10px] text-white/30">
                        {formatDate(tx.date)}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        isIncome ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setTransactionToDelete(tx)}
                      disabled={isDeleting}
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={transactionToDelete !== null}
      onOpenChange={(open) => {
        if (!open) setTransactionToDelete(null);
      }}
      title="Delete transaction?"
      description={
        transactionToDelete
          ? `"${transactionToDelete.description || "This transaction"}" on ${formatDate(transactionToDelete.date)} will be permanently deleted.`
          : ""
      }
      onConfirm={() => {
        if (transactionToDelete) deleteTransaction.mutate(transactionToDelete);
        setTransactionToDelete(null);
      }}
    />
    </>
  );
}
