import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wallet, LogOut } from "lucide-react";

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
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-800/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#07070f]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">
              FinanceTracker
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/50 hidden sm:block">
              Hey, <span className="text-white/80 font-medium">{displayName}</span> 👋
            </span>
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
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
