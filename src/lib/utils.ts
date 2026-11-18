import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const weightFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Lifting weights are always shown in kilograms. */
export function formatWeight(kg: number): string {
  return `${weightFormatter.format(kg)} kg`;
}

function rawErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Recognizes common Supabase/network failures and returns a safe explanation. */
function recognizedError(error: unknown): string | null {
  const message = rawErrorMessage(error);

  if (/failed to fetch|network|fetch failed|load failed/i.test(message)) {
    return "Check your connection and try again.";
  }
  if (/jwt|session|refresh token|401/i.test(message)) {
    return "Your session expired. Please sign in again.";
  }
  if (/permission|row-level|rls|403/i.test(message)) {
    return "You don't have permission to do that.";
  }
  return null;
}

/** Turns low-level Supabase/network errors into messages safe to show in the UI. */
export function friendlyErrorMessage(error: unknown, context: string): string {
  const recognized = recognizedError(error);

  if (recognized === "Check your connection and try again.") {
    return `${context} ${recognized}`;
  }
  return recognized ?? `${context} Please try again.`;
}

/** Sanitizes mutation errors for toasts, keeping intentional app messages. */
export function friendlyMutationError(error: unknown): string {
  const recognized = recognizedError(error);
  if (recognized) return recognized;

  const message = rawErrorMessage(error);
  const isDbInternals =
    /constraint|policy|relation|column|syntax|duplicate key|violat|pg_|invalid input|malformed/i.test(
      message
    );

  return isDbInternals ? "Something went wrong. Please try again." : message;
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export function formatDate(dateStr: string): string {
  return dateFormatter.format(parseLocalDate(dateStr));
}

export function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayLocal(): string {
  return formatDateInput(new Date());
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("default", {
    month: "long",
  });
}

export function getMonthYearLabel(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function getCurrentMonthYear(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
