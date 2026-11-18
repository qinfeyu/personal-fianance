"use client";

import { useState } from "react";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { type CategorySpend } from "@/lib/types";
import { useSetBudget } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

interface CategoryBreakdownProps {
  categories: CategorySpend[];
  year: number;
  month: number;
  loading?: boolean;
}

export function CategoryBreakdown({
  categories,
  year,
  month,
  loading,
}: CategoryBreakdownProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [expanded, setExpanded] = useState(true);
  const setBudget = useSetBudget(year, month);

  const savingId = setBudget.isPending
    ? setBudget.variables?.categoryId ?? null
    : null;

  function saveBudget(categoryId: string) {
    const value = parseFloat(budgetInput);

    if (isNaN(value) || value < 0) {
      setEditingId(null);
      return;
    }

    setEditingId(null);
    setBudget.mutate({ categoryId, budgetLimit: value });
  }

  function getProgressColor(pct: number): string {
    if (pct >= 100) return "bg-red-500";
    if (pct >= 80) return "bg-orange-500";
    if (pct >= 60) return "bg-yellow-500";
    return "bg-violet-500";
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="h-4 bg-white/10 rounded w-20" />
              </div>
              <div className="h-2 bg-white/10 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalSpent = categories.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <Card id="category-breakdown-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Category Breakdown</span>
            <span className="text-xs font-normal text-white/40 ml-1">
              {formatCurrency(totalSpent)} total
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
            aria-label="Toggle breakdown"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-1 pt-0">
          {categories.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-8">
              No expenses logged this month
            </p>
          ) : (
            categories.map((item) => {
              const pct = item.percentage;
              const hasLimit = item.budgetLimit > 0;

              return (
                <div
                  key={item.category.id}
                  className="group py-3 px-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150"
                >
                  <div className="flex items-center justify-between mb-2">
                    {/* Left: icon + name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="text-xl flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: item.category.color + "22",
                        }}
                      >
                        {item.category.icon}
                      </span>
                      <span className="text-sm font-medium text-white/90 truncate">
                        {item.category.name}
                      </span>
                    </div>

                    {/* Right: amounts + edit */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {editingId === item.category.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/40 text-xs">€</span>
                          <Input
                            id={`budget-input-${item.category.id}`}
                            type="number"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            className="h-7 w-24 text-xs py-0"
                            placeholder="Budget"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveBudget(item.category.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => saveBudget(item.category.id)}
                            disabled={savingId === item.category.id}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setEditingId(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-white">
                              {formatCurrency(item.totalSpent)}
                            </span>
                            {hasLimit && (
                              <span className="text-xs text-white/40 ml-1">
                                / {formatCurrency(item.budgetLimit)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingId(item.category.id);
                              setBudgetInput(
                                item.budgetLimit > 0
                                  ? String(item.budgetLimit)
                                  : ""
                              );
                            }}
                            aria-label={`Set budget for ${item.category.name}`}
                          >
                            <Settings2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasLimit ? (
                    <div className="space-y-1">
                      <Progress
                        value={Math.min(pct, 100)}
                        indicatorClassName={cn(getProgressColor(pct))}
                        className="h-1.5"
                      />
                      <div className="flex justify-between">
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            pct >= 100
                              ? "text-red-400"
                              : pct >= 80
                              ? "text-orange-400"
                              : "text-white/30"
                          )}
                        >
                          {pct >= 100 ? "Over budget!" : `${Math.round(pct)}% used`}
                        </span>
                        {hasLimit && pct < 100 && (
                          <span className="text-[10px] text-white/30">
                            {formatCurrency(item.budgetLimit - item.totalSpent)} left
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/20 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (item.totalSpent / (totalSpent || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      )}
    </Card>
  );
}
