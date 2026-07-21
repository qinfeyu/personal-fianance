"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMonthYearLabel } from "@/lib/utils";

interface MonthSwitcherProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthSwitcher({ year, month, onMonthChange }: MonthSwitcherProps) {
  function goToPrevMonth() {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  }

  function goToNextMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Don't allow going past current month
    if (year === currentYear && month === currentMonth) return;

    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  }

  function goToCurrentMonth() {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  }

  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevMonth}
        aria-label="Previous month"
        className="h-8 w-8"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <Calendar className="w-4 h-4 text-violet-400" />
        <span className="font-semibold text-white text-sm">
          {getMonthYearLabel(year, month)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="h-8 w-8"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="secondary"
          size="sm"
          onClick={goToCurrentMonth}
          className="text-xs h-7"
        >
          Today
        </Button>
      )}
    </div>
  );
}
