"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  HandCoins,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Euro,
  CheckCircle2,
  Clock,
  AlertCircle,
  HeartHandshake,
  Trash2,
  History,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { type Loan, type LoanRepayment } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const addLoanSchema = z.object({
  borrower_name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  date_lent: z.string().min(1, "Date is required"),
  due_date: z.string().optional(),
});

const repaymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type AddLoanValues = z.infer<typeof addLoanSchema>;
type RepaymentValues = z.infer<typeof repaymentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getLoanStatus(loan: Loan): {
  label: string;
  color: string;
  icon: React.ReactNode;
  isOverdue: boolean;
} {
  if (loan.status === "repaid") {
    return {
      label: "Repaid",
      color: "text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      isOverdue: false,
    };
  }
  if (loan.status === "forgiven") {
    return {
      label: "Forgiven",
      color: "text-white/40",
      icon: <HeartHandshake className="w-3.5 h-3.5" />,
      isOverdue: false,
    };
  }
  if (loan.due_date) {
    const isOverdue = new Date(loan.due_date) < new Date();
    return {
      label: isOverdue ? "Overdue" : "Due " + formatDate(loan.due_date),
      color: isOverdue ? "text-red-400" : "text-orange-400",
      icon: isOverdue ? (
        <AlertCircle className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      ),
      isOverdue,
    };
  }
  return {
    label: "Outstanding",
    color: "text-violet-400",
    icon: <Clock className="w-3.5 h-3.5" />,
    isOverdue: false,
  };
}

// ─── Add Loan Form ────────────────────────────────────────────────────────────

function AddLoanForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<AddLoanValues>({ resolver: zodResolver(addLoanSchema) as any,
    defaultValues: { date_lent: today },
  });

  async function onSubmit(data: AddLoanValues) {
    const parsedAmount = parseFloat(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("loans").insert({
      user_id: user.id,
      borrower_name: data.borrower_name.trim(),
      original_amount: parsedAmount,
      description: data.description?.trim() || null,
      date_lent: data.date_lent,
      due_date: data.due_date || null,
      status: "active",
    });

    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4 space-y-4"
    >
      <p className="text-sm font-semibold text-violet-300 flex items-center gap-2">
        <HandCoins className="w-4 h-4" />
        Record a new loan
      </p>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="loan-borrower">Borrower Name</Label>
        <Input
          id="loan-borrower"
          placeholder="e.g. Ahmed, Sara..."
          {...register("borrower_name")}
        />
        {errors.borrower_name && (
          <p className="text-red-400 text-xs">{errors.borrower_name.message}</p>
        )}
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="loan-amount">Amount (€)</Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="loan-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="pl-9"
              {...register("amount")}
            />
          </div>
          {errors.amount && (
            <p className="text-red-400 text-xs">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-date">Date Lent</Label>
          <Input
            id="loan-date"
            type="date"
            className="[color-scheme:dark]"
            {...register("date_lent")}
          />
        </div>
      </div>

      {/* Description + Due Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="loan-description">
            Reason{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </Label>
          <Input
            id="loan-description"
            placeholder="e.g. Urgent bill, trip..."
            {...register("description")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-due">
            Due Date{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </Label>
          <Input
            id="loan-due"
            type="date"
            className="[color-scheme:dark]"
            {...register("due_date")}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Save Loan"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Repayment Form (inline per loan) ────────────────────────────────────────

function RepaymentForm({
  loan,
  onSaved,
  onCancel,
}: {
  loan: Loan;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const outstanding = loan.original_amount - loan.amount_repaid;
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<RepaymentValues>({ resolver: zodResolver(repaymentSchema) as any,
    defaultValues: {
      amount: String(outstanding.toFixed(2)),
      date: today,
    },
  });

  async function onSubmit(data: RepaymentValues) {
    const parsedAmount = parseFloat(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Clamp to outstanding
    const clamped = Math.min(parsedAmount, outstanding);
    const newRepaid = loan.amount_repaid + clamped;
    const isFullyRepaid = newRepaid >= loan.original_amount;

    // Insert repayment record
    await supabase.from("loan_repayments").insert({
      loan_id: loan.id,
      user_id: user.id,
      amount: clamped,
      date: data.date,
      notes: data.notes?.trim() || null,
    });

    // Update loan
    await supabase
      .from("loans")
      .update({
        amount_repaid: newRepaid,
        status: isFullyRepaid ? "repaid" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", loan.id);

    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-emerald-400">
        Record repayment — outstanding:{" "}
        <span className="font-bold">{formatCurrency(outstanding)}</span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Amount (€)</Label>
          <div className="relative">
            <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              className="pl-8 h-8 text-sm"
              {...register("amount")}
            />
          </div>
          {errors.amount && (
            <p className="text-red-400 text-[10px]">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            className="h-8 text-sm [color-scheme:dark]"
            {...register("date")}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Notes <span className="text-white/30">(optional)</span>
        </Label>
        <Input
          className="h-8 text-sm"
          placeholder="e.g. Cash, bank transfer..."
          {...register("notes")}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "Confirm Payment"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Repayment History (expandable per loan) ──────────────────────────────────

function RepaymentHistory({ loanId }: { loanId: string }) {
  const supabase = createClient();
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("loan_repayments")
        .select("*")
        .eq("loan_id", loanId)
        .order("date", { ascending: false });
      setRepayments(data || []);
      setLoading(false);
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  if (loading) return <div className="h-8 animate-pulse bg-white/5 rounded-lg mt-2" />;

  if (repayments.length === 0)
    return (
      <p className="text-[10px] text-white/30 mt-2 italic">
        No repayments recorded yet.
      </p>
    );

  return (
    <div className="mt-2 space-y-1">
      {repayments.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          <span className="text-emerald-400 font-semibold">
            +{formatCurrency(r.amount)}
          </span>
          <span className="text-white/30">{formatDate(r.date)}</span>
          {r.notes && (
            <span className="text-white/40 truncate">· {r.notes}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Loan Card ─────────────────────────────────────────────────────────────────

function LoanCard({
  loan,
  onRefresh,
}: {
  loan: Loan;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const outstanding = loan.original_amount - loan.amount_repaid;
  const pct = Math.min((loan.amount_repaid / loan.original_amount) * 100, 100);
  const { label, color, icon, isOverdue } = getLoanStatus(loan);
  const isDone = loan.status === "repaid" || loan.status === "forgiven";

  async function handleForgive() {
    await supabase
      .from("loans")
      .update({ status: "forgiven", updated_at: new Date().toISOString() })
      .eq("id", loan.id);
    onRefresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("loans").delete().eq("id", loan.id);
    onRefresh();
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        isDone
          ? "border-white/[0.04] bg-white/[0.01] opacity-60"
          : isOverdue
          ? "border-red-500/20 bg-red-500/[0.03]"
          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
            isDone
              ? "bg-white/10 text-white/40"
              : isOverdue
              ? "bg-red-500/20 text-red-300"
              : "bg-violet-500/20 text-violet-300"
          )}
        >
          {getInitials(loan.borrower_name)}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {loan.borrower_name}
              </p>
              {loan.description && (
                <p className="text-[11px] text-white/40 mt-0.5 truncate">
                  {loan.description}
                </p>
              )}
            </div>

            {/* Amount column */}
            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold text-white">
                {formatCurrency(loan.original_amount)}
              </p>
              {!isDone && loan.amount_repaid > 0 && (
                <p className="text-[10px] text-white/40">
                  {formatCurrency(outstanding)} left
                </p>
              )}
            </div>
          </div>

          {/* Progress bar (only when partial repayment) */}
          {loan.amount_repaid > 0 && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-white/30">
                {formatCurrency(loan.amount_repaid)} repaid
                {" · "}
                {Math.round(pct)}%
              </p>
            </div>
          )}

          {/* Status + date */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn("flex items-center gap-1 text-[11px] font-medium", color)}>
              {icon}
              {label}
            </span>
            <span className="text-[10px] text-white/30">
              Lent {formatDate(loan.date_lent)}
            </span>
          </div>

          {/* Action buttons */}
          {!isDone && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                onClick={() => {
                  setShowRepayForm(!showRepayForm);
                  setShowHistory(false);
                }}
              >
                <Euro className="w-3 h-3" />
                Record Payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowRepayForm(false);
                }}
              >
                <History className="w-3 h-3" />
                History
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-white/30 hover:text-white/60 gap-1"
                onClick={handleForgive}
                title="Mark as forgiven (written off)"
              >
                <HeartHandshake className="w-3 h-3" />
                Forgive
              </Button>
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-3 h-3" />
                History
              </Button>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-white/20 hover:text-red-400 transition-colors p-1 flex-shrink-0"
          title="Delete loan"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Repayment form */}
      {showRepayForm && (
        <RepaymentForm
          loan={loan}
          onSaved={() => {
            setShowRepayForm(false);
            onRefresh();
          }}
          onCancel={() => setShowRepayForm(false)}
        />
      )}

      {/* History */}
      {showHistory && <RepaymentHistory loanId={loan.id} />}
    </div>
  );
}

// ─── Main LoansTracker Component ──────────────────────────────────────────────

export function LoansTracker() {
  const supabase = createClient();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchLoans = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoans((data as Loan[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const activeLoans = loans.filter((l) => l.status === "active");
  const doneLoans = loans.filter(
    (l) => l.status === "repaid" || l.status === "forgiven"
  );
  const totalOutstanding = activeLoans.reduce(
    (sum, l) => sum + (l.original_amount - l.amount_repaid),
    0
  );

  return (
    <Card id="loans-tracker-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-violet-400" />
            Loans &amp; Lending
            {!loading && activeLoans.length > 0 && (
              <span className="text-xs font-normal text-white/40 ml-1">
                {formatCurrency(totalOutstanding)} outstanding
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!showAddForm && (
              <Button
                id="add-loan-btn"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Lend Money
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-3">
          {/* Add loan form */}
          {showAddForm && (
            <AddLoanForm
              onSaved={() => {
                setShowAddForm(false);
                fetchLoans();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="animate-pulse h-20 rounded-xl bg-white/5"
                />
              ))}
            </div>
          ) : activeLoans.length === 0 && !showAddForm ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-3xl">🤝</p>
              <p className="text-white/40 text-sm">No active loans</p>
              <p className="text-white/25 text-xs">
                Click &quot;Lend Money&quot; to track a new loan
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} onRefresh={fetchLoans} />
              ))}
            </div>
          )}

          {/* Repaid / Forgiven section */}
          {!loading && doneLoans.length > 0 && (
            <div className="pt-1">
              <button
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                onClick={() => setShowDone(!showDone)}
              >
                {showDone ? (
                  <X className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {showDone ? "Hide" : "Show"} {doneLoans.length} settled loan
                {doneLoans.length > 1 ? "s" : ""}
              </button>

              {showDone && (
                <div className="space-y-2 mt-2">
                  {doneLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onRefresh={fetchLoans}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
