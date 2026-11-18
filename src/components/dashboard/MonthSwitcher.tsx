"use client";

import { memo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchDashboardData } from "@/hooks/useDashboard";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { getMonthYearLabel } from "@/lib/utils";

interface MonthSwitcherProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export const MonthSwitcher = memo(function MonthSwitcher({ year, month, onMonthChange }: MonthSwitcherProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = year === currentYear && month === currentMonth;

  const prefetchMonth = useCallback(
    (targetYear: number, targetMonth: number) => {
      // Seeding a future month would create recurring rows too early.
      if (targetYear * 12 + targetMonth > currentYear * 12 + currentMonth) return;

      void queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard(userId, targetYear, targetMonth),
        queryFn: () => fetchDashboardData(userId, targetYear, targetMonth),
      });
    },
    [currentYear, currentMonth, queryClient, userId]
  );

  const prefetchNeighbours = useCallback(() => {
    prefetchMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
    if (year * 12 + month < currentYear * 12 + currentMonth) {
      prefetchMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
    }
  }, [prefetchMonth, year, month, currentYear, currentMonth]);

  useEffect(() => {
    const timer = window.setTimeout(prefetchNeighbours, 600);
    return () => window.clearTimeout(timer);
  }, [prefetchNeighbours]);

  const goToPrevMonth = useCallback(() => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  }, [year, month, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    if (isCurrentMonth) return;
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  }, [year, month, isCurrentMonth, onMonthChange]);

  const goToCurrentMonth = useCallback(() => {
    onMonthChange(currentYear, currentMonth);
  }, [currentYear, currentMonth, onMonthChange]);

  return (
    <div className="flex items-center gap-2" onPointerEnter={prefetchNeighbours}>
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
});
