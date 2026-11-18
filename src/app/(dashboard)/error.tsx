"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
      <AlertTriangle className="w-8 h-8 text-orange-400" />
      <h2 className="mt-4 text-lg font-semibold text-white">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-sm text-sm text-white/40">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
