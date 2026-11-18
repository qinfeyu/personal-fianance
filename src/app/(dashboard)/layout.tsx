import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wallet, LogOut, User } from "lucide-react";
import Link from "next/link";
import { NavLinks } from "@/components/navigation/NavLinks";
import { DashboardMain } from "@/components/layout/DashboardMain";
import { signOut } from "./actions";
import { UserIdProvider } from "@/lib/user-context";

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
      {/* Ambient background glows — static gradients, no blur filters to repaint on scroll */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(600px circle at 90% 10%, rgba(109,40,217,0.12), transparent 70%), radial-gradient(500px circle at 10% 90%, rgba(88,28,135,0.14), transparent 70%)",
        }}
      />

      {/* MOBILE HEADER (Top) */}
      <header className="md:hidden w-full border-b border-white/[0.06] bg-[#090912]/95 flex items-center justify-between p-4 sticky top-0 z-20 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-900/50 flex-shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-base">
            LifeOrganizer
          </span>
        </Link>

        {/* Mobile logout */}
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#090912] border-t border-white/[0.08] px-4 py-2">
        <NavLinks variant="mobile" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.06] bg-[#090912]/95 flex-col justify-between p-6 sticky top-0 h-screen z-20 flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-900/50 flex-shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight text-lg">
                LifeOrganizer
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <NavLinks variant="desktop" />
        </div>

        {/* Footer Area for Desktop */}
        <div className="flex flex-col gap-4 border-t border-white/10 pt-4 mt-auto">
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

          <form action={signOut}>
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
      <DashboardMain>
        <UserIdProvider userId={user.id}>{children}</UserIdProvider>
      </DashboardMain>
    </div>
  );
}
