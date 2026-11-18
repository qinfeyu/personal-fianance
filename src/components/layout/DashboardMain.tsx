"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Main content wrapper. Overview gets a wider canvas on desktop. */
export function DashboardMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/overview";

  return (
    <main
      className={cn(
        "flex-1 relative z-10 p-4 sm:p-6 md:p-8 w-full mx-auto pb-24 md:pb-8",
        isOverview ? "max-w-[1600px]" : "max-w-5xl"
      )}
    >
      {children}
    </main>
  );
}
