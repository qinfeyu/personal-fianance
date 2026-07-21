"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KPICards } from "@/components/dashboard/KPICards";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal";
import { MonthSwitcher } from "@/components/dashboard/MonthSwitcher";
import {
  type Transaction,
  type Category,
  type CategorySpend,
  type MonthSummary,
} from "@/lib/types";
import { getCurrentMonthYear } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  { name: "Rent", icon: "🏠", color: "#ef4444", sort_order: 1 },
  { name: "Groceries", icon: "🛒", color: "#f97316", sort_order: 2 },
  { name: "Gym", icon: "💪", color: "#22c55e", sort_order: 3 },
  { name: "Transportation", icon: "🚌", color: "#3b82f6", sort_order: 4 },
  { name: "Subscriptions", icon: "📱", color: "#8b5cf6", sort_order: 5 },
  { name: "Additional", icon: "🛍️", color: "#ec4899", sort_order: 6 },
  { name: "Gas", icon: "⛽", color: "#f59e0b", sort_order: 7 },
  { name: "Savings", icon: "🏦", color: "#10b981", sort_order: 8 },
];

export default function DashboardPage() {
  const supabase = createClient();
  const { year: currentYear, month: currentMonth } = getCurrentMonthYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySpends, setCategorySpends] = useState<CategorySpend[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    remaining: 0,
  });
  const [loading, setLoading] = useState(true);

  // Seed default categories for a new user if they have none
  async function seedCategories(userId: string) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("categories").insert(
        DEFAULT_CATEGORIES.map((cat) => ({ ...cat, user_id: userId }))
      );
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Seed categories on first load
    await seedCategories(user.id);

    // Fetch categories
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    const catList: Category[] = cats || [];
    setCategories(catList);

    // Fetch transactions for selected month
    const { data: txs } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .eq("year", year)
      .eq("month", month)
      .order("date", { ascending: false });

    const txList: Transaction[] = (txs || []) as Transaction[];
    setTransactions(txList);

    // Compute summary
    const totalIncome = txList
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = txList
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    setSummary({
      totalIncome,
      totalExpenses,
      remaining: totalIncome - totalExpenses,
    });

    // Fetch category budgets for this month
    const { data: budgets } = await supabase
      .from("category_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("year", year)
      .eq("month", month);

    const budgetMap = new Map<string, number>(
      (budgets || []).map((b) => [b.category_id, b.budget_limit])
    );

    // Build category spend data — include all categories with > 0 spend, plus ones with a budget
    const spendMap = new Map<string, number>();
    txList
      .filter((t) => t.type === "expense" && t.category_id)
      .forEach((t) => {
        spendMap.set(
          t.category_id!,
          (spendMap.get(t.category_id!) || 0) + t.amount
        );
      });

    const catSpends: CategorySpend[] = catList
      .filter(
        (cat) => spendMap.has(cat.id) || (budgetMap.get(cat.id) ?? 0) > 0
      )
      .map((cat) => {
        const totalSpent = spendMap.get(cat.id) || 0;
        const budgetLimit = budgetMap.get(cat.id) || 0;
        const percentage =
          budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;
        return { category: cat, totalSpent, budgetLimit, percentage };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    setCategorySpends(catSpends);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
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
          <AddTransactionModal
            categories={categories}
            year={year}
            month={month}
            onSuccess={loadData}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards summary={summary} loading={loading} />

      {/* Two-column layout: breakdown + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown
          categories={categorySpends}
          year={year}
          month={month}
          loading={loading}
          onRefresh={loadData}
        />

        <TransactionList
          transactions={transactions}
          loading={loading}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}
