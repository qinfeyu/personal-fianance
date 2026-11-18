import type {
  Category,
  CategoryBudget,
  CategorySpend,
  DashboardData,
  MonthSummary,
  Transaction,
} from "@/lib/types";

export function toBudgetMap(
  budgets: Pick<CategoryBudget, "category_id" | "budget_limit">[]
): Record<string, number> {
  return Object.fromEntries(
    budgets.map((budget) => [budget.category_id, budget.budget_limit])
  );
}

function getSummary(transactions: Transaction[]): MonthSummary {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const transaction of transactions) {
    if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    remaining: totalIncome - totalExpenses,
  };
}

function getCategorySpends(
  categories: Category[],
  transactions: Transaction[],
  budgets: Record<string, number>
): CategorySpend[] {
  const spendMap = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || !transaction.category_id) continue;

    spendMap.set(
      transaction.category_id,
      (spendMap.get(transaction.category_id) || 0) + transaction.amount
    );
  }

  return categories
    .filter(
      (category) =>
        spendMap.has(category.id) || (budgets[category.id] ?? 0) > 0
    )
    .map((category) => {
      const totalSpent = spendMap.get(category.id) || 0;
      const budgetLimit = budgets[category.id] || 0;

      return {
        category,
        totalSpent,
        budgetLimit,
        percentage: budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export function buildDashboardData(
  categories: Category[],
  transactions: Transaction[],
  budgets: Record<string, number>
): DashboardData {
  return {
    categories,
    transactions,
    budgets,
    summary: getSummary(transactions),
    categorySpends: getCategorySpends(categories, transactions, budgets),
  };
}

export function addTransactionToDashboard(
  data: DashboardData,
  transaction: Transaction
): DashboardData {
  const transactions = [
    transaction,
    ...data.transactions.filter((item) => item.id !== transaction.id),
  ];

  return buildDashboardData(data.categories, transactions, data.budgets);
}

export function removeTransactionFromDashboard(
  data: DashboardData,
  transactionId: string
): DashboardData {
  return buildDashboardData(
    data.categories,
    data.transactions.filter((item) => item.id !== transactionId),
    data.budgets
  );
}

export function applyBudgetToDashboard(
  data: DashboardData,
  categoryId: string,
  budgetLimit: number
): DashboardData {
  const budgets = { ...data.budgets, [categoryId]: budgetLimit };

  if (budgetLimit <= 0) {
    delete budgets[categoryId];
  }

  return buildDashboardData(data.categories, data.transactions, budgets);
}
