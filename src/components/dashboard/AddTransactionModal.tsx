"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Euro } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddTransaction } from "@/hooks/useDashboard";
import { type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category_id: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof schema>;

interface AddTransactionModalProps {
  categories: Category[];
  year: number;
  month: number;
}

export function AddTransactionModal({
  categories,
  year,
  month,
}: AddTransactionModalProps) {
  const [open, setOpen] = useState(false);
  const addTransaction = useAddTransaction(year, month);

  // Default date = current day if we're viewing the current month, otherwise 1st day of the selected month
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const day = isCurrentMonth ? now.getDate() : 1;
  const defaultDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const monthPrefix = defaultDate.slice(0, 7);
  const lastDay = new Date(year, month, 0).getDate();
  const maxDate = isCurrentMonth
    ? defaultDate
    : `${monthPrefix}-${String(lastDay).padStart(2, "0")}`;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormValues>({ resolver: zodResolver(schema) as any,
    defaultValues: {
      type: "expense",
      date: defaultDate,
    },
  });

  const selectedType = useWatch({ control, name: "type" });

  async function onSubmit(data: FormValues) {
    const category = categories.find((item) => item.id === data.category_id);

    try {
      await addTransaction.mutateAsync({
        type: data.type,
        amount: data.amount,
        category_id:
          data.type === "income" || !data.category_id
            ? null
            : data.category_id,
        description: data.description || null,
        date: data.date,
        category: category ?? null,
      });

      reset({ type: "expense", date: defaultDate });
      setOpen(false);
    } catch {
      // The mutation surfaces its own error toast.
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      reset({ type: "expense", date: defaultDate });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button id="add-transaction-btn" className="gap-2 shadow-lg shadow-violet-900/30">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            New Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Type Toggle */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue("type", t)}
                  className={cn(
                    "rounded-lg py-2 text-sm font-medium capitalize transition-all duration-200",
                    selectedType === t
                      ? t === "income"
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-red-600 text-white shadow"
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  {t === "income" ? "💰 Income" : "💸 Expense"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (€)</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="pl-9 text-lg font-semibold"
                {...register("amount")}
              />
            </div>
            {errors.amount && (
              <p className="text-red-400 text-xs">{errors.amount.message}</p>
            )}
          </div>

          {/* Category (only for expenses) */}
          {selectedType === "expense" && (
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                onValueChange={(val) => setValue("category_id", val)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
              className="[color-scheme:dark]"
              min={`${monthPrefix}-01`}
              max={maxDate}
            />
            {errors.date && (
              <p className="text-red-400 text-xs">{errors.date.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-white/30 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="e.g. Monthly gym membership, Lidl groceries..."
              rows={2}
              {...register("description")}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              id="save-transaction-btn"
              type="submit"
              disabled={isSubmitting}
              className={cn(
                selectedType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Save ${selectedType === "income" ? "Income" : "Expense"}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
