import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { RecurringTransaction } from "@/lib/types";

export const DEFAULT_CATEGORIES = [
  { name: "Rent", icon: "🏠", color: "#ef4444", sort_order: 1 },
  { name: "Groceries", icon: "🛒", color: "#f97316", sort_order: 2 },
  { name: "Gym", icon: "💪", color: "#22c55e", sort_order: 3 },
  { name: "Transportation", icon: "🚌", color: "#3b82f6", sort_order: 4 },
  { name: "Subscriptions", icon: "📱", color: "#8b5cf6", sort_order: 5 },
  { name: "Additional", icon: "🛍️", color: "#ec4899", sort_order: 6 },
  { name: "Gas", icon: "⛽", color: "#f59e0b", sort_order: 7 },
  { name: "Savings", icon: "🏦", color: "#10b981", sort_order: 8 },
] as const;

let rpcSeedingUnavailable = false;

function isMissingFunction(error: PostgrestError): boolean {
  return (
    error.code === "PGRST202" ||
    error.message.includes("Could not find the function") ||
    error.message.includes("does not exist")
  );
}

async function seedDefaultCategories(userId: string) {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) return;

  const { error } = await supabase
    .from("categories")
    .insert(DEFAULT_CATEGORIES.map((category) => ({ ...category, user_id: userId })));

  if (error) throw new Error(error.message);
}

async function seedRecurring(userId: string, year: number, month: number) {
  const supabase = createClient();

  const [templatesResult, existingResult, dismissalsResult] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true),
    supabase
      .from("transactions")
      .select("recurring_transaction_id")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .not("recurring_transaction_id", "is", null),
    supabase
      .from("recurring_transaction_dismissals")
      .select("recurring_transaction_id")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month),
  ]);

  if (templatesResult.error) throw new Error(templatesResult.error.message);
  if (existingResult.error) throw new Error(existingResult.error.message);

  const templates = templatesResult.data as RecurringTransaction[] | null;
  if (!templates || templates.length === 0) return;

  const settledIds = new Set(
    [
      ...(existingResult.data || []),
      ...(dismissalsResult.error ? [] : dismissalsResult.data || []),
    ].map((row) => row.recurring_transaction_id)
  );

  const lastDay = new Date(year, month, 0).getDate();
  const toInsert = templates
    .filter((template) => !settledIds.has(template.id))
    .map((template) => {
      const day = Math.min(template.day_of_month, lastDay);
      return {
        user_id: userId,
        category_id: template.category_id,
        type: "expense" as const,
        amount: template.amount,
        description: template.description,
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
          2,
          "0"
        )}`,
        recurring_transaction_id: template.id,
      };
    });

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("transactions").insert(toInsert);
  if (error && error.code !== "23505") throw new Error(error.message);
}

// Each month only needs seeding once per browser session. Cache in-flight
// promises as well so parallel callers (queries + prefetches) share one request.
const monthReady = new Map<string, Promise<void>>();

function monthKey(userId: string, year: number, month: number): string {
  return `${userId}:${year}:${month}`;
}

/** Force the next load of these months to re-run seeding (e.g. after a template change). */
export function clearMonthReady(userId: string): void {
  const prefix = `${userId}:`;
  for (const key of monthReady.keys()) {
    if (key.startsWith(prefix)) monthReady.delete(key);
  }
}

export async function ensureMonthReady(
  userId: string,
  year: number,
  month: number
): Promise<void> {
  const key = monthKey(userId, year, month);
  const pending = monthReady.get(key);
  if (pending) return pending;

  const task = runEnsureMonthReady(userId, year, month).catch((error) => {
    // A failed attempt must not be cached, so the next load can retry.
    monthReady.delete(key);
    throw error;
  });
  monthReady.set(key, task);
  return task;
}

async function runEnsureMonthReady(
  userId: string,
  year: number,
  month: number
): Promise<void> {
  const supabase = createClient();

  if (!rpcSeedingUnavailable) {
    const { error } = await supabase.rpc("ensure_month_ready", {
      p_year: year,
      p_month: month,
    });

    if (!error) return;

    if (!isMissingFunction(error)) {
      throw new Error(error.message);
    }

    rpcSeedingUnavailable = true;
  }

  await Promise.all([
    seedDefaultCategories(userId),
    seedRecurring(userId, year, month),
  ]);
}
