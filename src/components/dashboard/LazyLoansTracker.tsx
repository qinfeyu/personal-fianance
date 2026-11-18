"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const LoansTracker = dynamic(
  () =>
    import("@/components/dashboard/LoansTracker").then(
      (module) => module.LoansTracker
    ),
  {
    loading: () => (
      <div className="animate-pulse h-72 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
    ),
  }
);

export function LazyLoansTracker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;

    if (!node || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={containerRef}>
      {visible ? (
        <LoansTracker />
      ) : (
        <div className="animate-pulse h-72 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
      )}
    </div>
  );
}
