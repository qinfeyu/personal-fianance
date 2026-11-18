"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Euro,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddRecurring,
  useDeleteRecurring,
  useRecurring,
  useToggleRecurring,
  useUpdateRecurring,
} from "@/hooks/useRecurring";
import { type Category, type RecurringTransaction } from "@/lib/types";
import { formatCurrency, friendlyErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";

const schema = z.object({
  category_id: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  day_of_month: z.coerce.number().int().min(1).max(28),
});

type FormValues = z.infer<typeof schema>;

interface ManageRecurringModalProps {
  categories: Category[];
}

export function ManageRecurringModal({
  categories,
}: ManageRecurringModalProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<RecurringTransaction | null>(null);

  const recurringQuery = useRecurring(open);
  const addRecurring = useAddRecurring();
  const updateRecurring = useUpdateRecurring();
  const toggleRecurring = useToggleRecurring();
  const deleteRecurring = useDeleteRecurring();

  const recurring = recurringQuery.data ?? [];
  const loading = recurringQuery.isLoading;
  const deletingId = deleteRecurring.isPending
    ? deleteRecurring.variables?.id
    : null;
  const togglingId = toggleRecurring.isPending
    ? toggleRecurring.variables?.id
    : null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormValues>({ resolver: zodResolver(schema) as any,
    defaultValues: { day_of_month: 1 },
  });

  const selectedCategoryId = useWatch({ control, name: "category_id" });

  async function onSubmit(data: FormValues) {
    const parsedAmount = parseFloat(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const payload = {
      category_id: data.category_id,
      description: data.description || null,
      amount: parsedAmount,
      day_of_month: data.day_of_month,
    };

    try {
      if (editingId) {
        await updateRecurring.mutateAsync({ id: editingId, ...payload });
      } else {
        await addRecurring.mutateAsync(payload);
      }

      reset({ day_of_month: 1 });
      setEditingId(null);
      setShowForm(false);
    } catch {
      // Mutations surface their own error toast.
    }
  }

  function handleDelete(item: RecurringTransaction) {
    setItemToDelete(item);
  }

  function handleToggle(item: RecurringTransaction) {
    toggleRecurring.mutate(item);
  }

  function startEdit(item: RecurringTransaction) {
    setEditingId(item.id);
    setShowForm(true);
    setValue("category_id", item.category_id || "");
    setValue("description", item.description || "");
    setValue("amount", String(item.amount));
    setValue("day_of_month", item.day_of_month);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    reset({ day_of_month: 1 });
  }

  const activeCount = recurring.filter((r) => r.active).length;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="manage-recurring-btn"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recurring
          {activeCount > 0 && (
            <span className="ml-0.5 bg-violet-500/30 text-violet-300 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            Recurring Transactions
          </DialogTitle>
          <p className="text-sm text-white/40 mt-1">
            These are auto-added each month when you open the dashboard.
            You can edit or delete them for any specific month afterwards.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {recurringQuery.error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 text-xs">
              {friendlyErrorMessage(recurringQuery.error, "Couldn't load your recurring transactions.")}
            </p>
          )}

          {/* Existing recurring list */}
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse h-14 rounded-xl bg-white/5"
                />
              ))}
            </div>
          ) : recurring.length === 0 && !showForm ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-3xl">🔄</p>
              <p className="text-white/40 text-sm">No recurring transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recurring.map((item) => {
                const cat = item.categories;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-150",
                      item.active
                        ? "border-white/[0.08] bg-white/[0.03]"
                        : "border-white/[0.04] bg-transparent opacity-50"
                    )}
                  >
                    {/* Category icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                      style={{ backgroundColor: (cat?.color || "#888") + "22" }}
                    >
                      {cat?.icon || "💰"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                          {item.description || cat?.name || "Recurring"}
                        </span>
                        {!item.active && (
                          <span className="text-[10px] text-white/30 font-medium">
                            paused
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cat && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: cat.color + "22",
                              color: cat.color,
                            }}
                          >
                            {cat.name}
                          </span>
                        )}
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                          <CalendarDays className="w-2.5 h-2.5" />
                          Day {item.day_of_month}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-bold text-white/90 flex-shrink-0">
                      {formatCurrency(item.amount)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id}
                        className="text-white/30 hover:text-violet-400 transition-colors p-1"
                        title={item.active ? "Pause" : "Resume"}
                        aria-label={`${item.active ? "Pause" : "Resume"} ${item.description || "recurring transaction"}`}
                        type="button"
                      >
                        {item.active ? (
                          <ToggleRight className="w-4 h-4 text-violet-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-white/30 hover:text-white transition-colors p-1"
                        title="Edit"
                        aria-label={`Edit ${item.description || "recurring transaction"}`}
                        type="button"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="text-white/30 hover:text-red-400 transition-colors p-1"
                        title="Delete"
                        aria-label={`Delete ${item.description || "recurring transaction"}`}
                        type="button"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add / Edit Form */}
          {showForm ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4 space-y-4"
            >
              <p className="text-sm font-semibold text-violet-300">
                {editingId ? "Edit recurring transaction" : "New recurring transaction"}
              </p>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="recurring-category">Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(v) => setValue("category_id", v)}
                >
                  <SelectTrigger id="recurring-category">
                    <SelectValue placeholder="Select category" />
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
                {errors.category_id && (
                  <p className="text-red-400 text-xs">{errors.category_id.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="recurring-description">
                  Description{" "}
                  <span className="text-white/30 font-normal">(optional)</span>
                </Label>
                <Input
                  id="recurring-description"
                  placeholder="e.g. Monthly rent, Netflix, Bus pass..."
                  {...register("description")}
                />
              </div>

              {/* Amount + Day of month */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="recurring-amount">Amount (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      id="recurring-amount"
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
                  <Label htmlFor="recurring-day">Day of Month</Label>
                  <Input
                    id="recurring-day"
                    type="number"
                    min="1"
                    max="28"
                    placeholder="1"
                    {...register("day_of_month")}
                  />
                  <p className="text-[10px] text-white/30">1–28 to avoid month-end issues</p>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={cancelForm} size="sm">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Add Recurring"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add Recurring Transaction
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={itemToDelete !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setItemToDelete(null);
      }}
      title="Delete recurring transaction?"
      description={
        itemToDelete
          ? `"${itemToDelete.description || "This template"}" will stop being added automatically. Past transactions stay in your history.`
          : ""
      }
      onConfirm={() => {
        if (itemToDelete) {
          deleteRecurring.mutate(itemToDelete);
          if (editingId === itemToDelete.id) cancelForm();
        }
        setItemToDelete(null);
      }}
    />
    </>
  );
}
