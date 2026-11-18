"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ListTodo, Target, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Finance", shortLabel: "Finance", icon: Wallet },
  { href: "/todo", label: "To-Do List", shortLabel: "To-Do", icon: ListTodo },
  { href: "/habits", label: "Habit Tracker", shortLabel: "Habits", icon: Flame },
  { href: "/goals", label: "Goals", shortLabel: "Goals", icon: Target },
] as const;

interface NavLinksProps {
  variant: "mobile" | "desktop";
}

export function NavLinks({ variant }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        variant === "mobile"
          ? "flex items-center justify-around w-full"
          : "flex flex-col gap-1 flex-shrink-0"
      )}
      aria-label="Main navigation"
    >
      {links.map(({ href, label, shortLabel, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        if (variant === "mobile") {
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 transition-colors",
                active ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              <Icon
                className={cn("w-5 h-5", active ? "text-violet-300" : "text-violet-400")}
              />
              <span className="text-[10px] font-medium">{shortLabel}</span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4 text-violet-400" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
