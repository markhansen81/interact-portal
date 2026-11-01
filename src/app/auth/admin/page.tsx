"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not an admin. Use the TA login instead.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="flex min-h-screen bg-[#2a2a2a]">
      {/* Left side — brand info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16">
        <h1
          className="text-6xl font-bold text-[#E91E8C] uppercase leading-none"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          ADMIN<br />DASHBOARD
        </h1>
        <p className="mt-6 text-lg text-[#999] max-w-md">
          Manage teaching artists, projects, offers, invoices, and operations. The command centre for InterACT English.
        </p>
        <div className="mt-12">
          <a
            href="mailto:connect@interactenglish.de"
            className="text-[#E91E8C] font-bold underline underline-offset-4 text-lg uppercase tracking-wide"
          >
            connect@interactenglish.de
          </a>
          <p className="mt-3 text-white font-bold text-lg">
            +49 (0) 30 20 33 97 02
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <h1
              className="text-4xl font-bold text-[#E91E8C] uppercase"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              ADMIN DASHBOARD
            </h1>
            <p className="mt-2 text-sm text-[#999]">InterACT English Management</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#E91E8C] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full border-b-2 border-[#555] bg-transparent px-0 py-3 text-sm text-white placeholder:text-[#666] focus:border-[#E91E8C] focus:outline-none transition-colors"
                placeholder="admin@interactenglish.de"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#E91E8C] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full border-b-2 border-[#555] bg-transparent px-0 py-3 text-sm text-white placeholder:text-[#666] focus:border-[#E91E8C] focus:outline-none transition-colors"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                onClick={handleLogin}
                className="rounded-sm bg-[#E91E8C]/80 px-10 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#E91E8C] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </div>

          <p className="mt-12 text-xs text-[#666]">
            Teaching Artist? <Link href="/auth/login" className="text-[#E91E8C] hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
