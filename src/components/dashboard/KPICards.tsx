"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { type MonthSummary } from "@/lib/types";

interface KPICardsProps {
  summary: MonthSummary;
  loading?: boolean;
}

export function KPICards({ summary, loading }: KPICardsProps) {
  const { totalIncome, totalExpenses, remaining } = summary;
  const isPositive = remaining >= 0;

  const cards = [
    {
      id: "income-card",
      label: "Total Income",
      value: totalIncome,
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
      valueColor: "text-emerald-400",
      glow: "shadow-emerald-900/20",
      borderColor: "border-emerald-500/20",
      gradient: "from-emerald-500/10 to-transparent",
    },
    {
      id: "spent-card",
      label: "Total Spent",
      value: totalExpenses,
      icon: TrendingDown,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/15",
      valueColor: "text-red-400",
      glow: "shadow-red-900/20",
      borderColor: "border-red-500/20",
      gradient: "from-red-500/10 to-transparent",
    },
    {
      id: "remaining-card",
      label: "Remaining",
      value: remaining,
      icon: Wallet,
      iconColor: isPositive ? "text-violet-400" : "text-orange-400",
      iconBg: isPositive ? "bg-violet-500/15" : "bg-orange-500/15",
      valueColor: isPositive ? "text-violet-300" : "text-orange-400",
      glow: isPositive ? "shadow-violet-900/20" : "shadow-orange-900/20",
      borderColor: isPositive ? "border-violet-500/20" : "border-orange-500/20",
      gradient: isPositive
        ? "from-violet-500/10 to-transparent"
        : "from-orange-500/10 to-transparent",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-24" />
                <div className="h-8 bg-white/10 rounded w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            id={card.id}
            className={`relative overflow-hidden border ${card.borderColor} shadow-xl ${card.glow} group hover:scale-[1.02] transition-transform duration-300`}
          >
            {/* Gradient top strip */}
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradient.replace("from-", "from-").replace("to-transparent", "to-transparent")}`}
            />
            <div
              className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${card.gradient} opacity-60 pointer-events-none`}
            />

            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-white/50 uppercase tracking-widest">
                    {card.label}
                  </p>
                  <p className={`text-3xl font-bold tracking-tight ${card.valueColor}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.iconBg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>

              {card.label === "Remaining" && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-white/40">
                    {isPositive
                      ? `${totalExpenses > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0}% of income spent`
                      : "Over budget this month"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
