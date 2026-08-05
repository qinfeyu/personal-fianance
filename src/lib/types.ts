export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Month {
  id: string;
  user_id: string;
  year: number;
  month: number;
  notes: string | null;
  created_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  year: number;
  month: number;
  budget_limit: number;
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string | null;
  amount: number;
  day_of_month: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  categories?: Category | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  recurring_transaction_id: string | null;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  date: string;
  year: number;
  month: number;
  created_at: string;
  // Joined fields
  categories?: Category | null;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
}

export interface CategorySpend {
  category: Category;
  totalSpent: number;
  budgetLimit: number;
  percentage: number;
}

export interface TransactionFormData {
  type: "income" | "expense";
  amount: number;
  category_id: string;
  description: string;
  date: string;
}

export type LoanStatus = "active" | "repaid" | "forgiven";

export interface Loan {
  id: string;
  user_id: string;
  borrower_name: string;
  original_amount: number;
  amount_repaid: number;
  description: string | null;
  date_lent: string;
  due_date: string | null;
  status: LoanStatus;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  user_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}
