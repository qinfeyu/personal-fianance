"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { KPICards } from "@/components/dashboard/KPICards";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import { LazyLoansTracker } from "@/components/dashboard/LazyLoansTracker";
import { useDashboard } from "@/hooks/useDashboard";
import { friendlyErrorMessage, getCurrentMonthYear } from "@/lib/utils";

const AddTransactionModal = dynamic(
  () => import("@/components/dashboard/AddTransactionModal").then((mod) => mod.AddTransactionModal),
  { ssr: false }
);

const ManageRecurringModal = dynamic(
  () => import("@/components/dashboard/ManageRecurringModal").then((mod) => mod.ManageRecurringModal),
  { ssr: false }
);

const EMPTY_SUMMARY = {
  totalIncome: 0,
  totalExpenses: 0,
  remaining: 0,
};

export default function DashboardPage() {
  const { year: currentYear, month: currentMonth } = getCurrentMonthYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const dashboardQuery = useDashboard(year, month);
  const data = dashboardQuery.data;

  const categories = data?.categories ?? [];
  const transactions = data?.transactions ?? [];
  const categorySpends = data?.categorySpends ?? [];
  const summary = data?.summary ?? EMPTY_SUMMARY;

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Monthly Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Track and manage your monthly finances
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <MonthSwitcher
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
          />
          {dashboardQuery.isFetching && (
            <Loader2
              className="w-4 h-4 text-violet-400 animate-spin"
              aria-label="Refreshing dashboard"
            />
          )}
          <ManageRecurringModal categories={categories} />
          <AddTransactionModal
            categories={categories}
            year={year}
            month={month}
          />
        </div>
      </div>

      {dashboardQuery.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {friendlyErrorMessage(dashboardQuery.error, "Couldn't load your dashboard.")}
        </div>
      )}

      <KPICards summary={summary} loading={dashboardQuery.isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown
          categories={categorySpends}
          year={year}
          month={month}
          loading={dashboardQuery.isLoading}
        />

        <TransactionList
          transactions={transactions}
          year={year}
          month={month}
          loading={dashboardQuery.isLoading}
        />
      </div>

      <LazyLoansTracker />
    </div>
  );
}
