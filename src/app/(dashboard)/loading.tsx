export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-white/10" />
          <div className="h-4 w-64 rounded bg-white/5" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-56 rounded-xl bg-white/5" />
          <div className="h-9 w-28 rounded-xl bg-white/5" />
          <div className="h-9 w-32 rounded-xl bg-white/5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-white/5" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-white/5" />
        <div className="h-72 rounded-xl bg-white/5" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
