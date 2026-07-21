"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  }

  if (magicLinkSent) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Mail className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Check your email</h2>
        <p className="text-white/60 max-w-sm mx-auto">
          We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in instantly.
        </p>
        <Button variant="ghost" onClick={() => setMagicLinkSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-900/50">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-white/50 text-sm">
          {isLogin
            ? "Sign in to your finance dashboard"
            : "Start tracking your finances today"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                id="full_name"
                type="text"
                placeholder="Mohamed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full group" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>

        {isLogin && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a14] px-2 text-white/40">or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLink}
              disabled={loading}
            >
              <Mail className="w-4 h-4" />
              Send Magic Link
            </Button>
          </>
        )}
      </form>

      <p className="text-center text-sm text-white/40">
        {isLogin ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Sign up free
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
