"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: string;
  open: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { ...options, id, open: true }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            open={item.open}
            duration={5000}
            onOpenChange={(open) => {
              if (open) return;
              setToasts((current) =>
                current.filter((toastItem) => toastItem.id !== item.id)
              );
            }}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border p-4 shadow-2xl",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              item.variant === "error"
                ? "border-red-500/30 bg-[#1a0f14] text-red-200"
                : item.variant === "success"
                ? "border-emerald-500/30 bg-[#0c1714] text-emerald-200"
                : "border-white/10 bg-[#0f0f1a] text-white"
            )}
          >
            {item.variant === "error" ? (
              <XCircle className="mt-0.5 h-5 w-5 text-red-400" />
            ) : item.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
            ) : (
              <span className="mt-0.5 h-5 w-5" />
            )}

            <div className="min-w-0">
              {item.title && (
                <ToastPrimitive.Title className="text-sm font-semibold">
                  {item.title}
                </ToastPrimitive.Title>
              )}
              {item.description && (
                <ToastPrimitive.Description className="mt-0.5 text-xs opacity-70">
                  {item.description}
                </ToastPrimitive.Description>
              )}
            </div>

            <ToastPrimitive.Close
              className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-20 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none md:bottom-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
