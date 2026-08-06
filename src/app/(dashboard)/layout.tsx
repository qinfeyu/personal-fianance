import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wallet, LogOut, ListTodo, Flame, Target, User } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col md:flex-row relative">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-800/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar for Desktop / Header for Mobile */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#090912]/80 backdrop-blur-xl flex flex-col justify-between p-4 md:p-6 md:sticky md:top-0 md:h-screen z-20 flex-shrink-0 relative">
        <div className="flex flex-col md:h-full">
          {/* Logo / Header */}
          <div className="flex items-center justify-between md:justify-start gap-2.5 mb-4 md:mb-8 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-900/50 flex-shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight text-lg">
                LifeOrganizer
              </span>
            </Link>

            {/* Logout on mobile */}
            <form
              action={async () => {
                "use server";
                const { createClient: createServerClient } = await import(
                  "@/lib/supabase/server"
                );
                const supabase = await createServerClient();
                await supabase.auth.signOut();
                const { redirect: serverRedirect } = await import(
                  "next/navigation"
                );
                serverRedirect("/login");
              }}
              className="md:hidden"
            >
              <button
                type="submit"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Navigation Links */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none flex-shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-150 whitespace-nowrap"
            >
              <Wallet className="w-4 h-4 text-violet-400" />
              <span>Finance</span>
            </Link>
            <Link
              href="/todo"
              className="flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-150 whitespace-nowrap"
            >
              <ListTodo className="w-4 h-4 text-violet-400" />
              <span>To-Do List</span>
            </Link>
            <Link
              href="/habits"
              className="flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-150 whitespace-nowrap"
            >
              <Flame className="w-4 h-4 text-violet-400" />
              <span>Habit Tracker</span>
            </Link>
            <Link
              href="/goals"
              className="flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-150 whitespace-nowrap"
            >
              <Target className="w-4 h-4 text-violet-400" />
              <span>Goals</span>
            </Link>
          </nav>
        </div>

        {/* Footer Area for Desktop */}
        <div className="hidden md:flex flex-col gap-4 border-t border-white/10 pt-4 mt-auto">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-white/30 leading-none">Logged in as</span>
              <span className="text-xs font-semibold text-white truncate mt-0.5 max-w-[140px]">
                {displayName}
              </span>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              const { createClient: createServerClient } = await import(
                "@/lib/supabase/server"
              );
              const supabase = await createServerClient();
              await supabase.auth.signOut();
              const { redirect: serverRedirect } = await import(
                "next/navigation"
              );
              serverRedirect("/login");
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/80 transition-colors px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
