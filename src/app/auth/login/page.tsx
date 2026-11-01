"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function TALoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/portal";
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#E91E8C]">
      {/* Giant title */}
      <div className="flex-shrink-0 overflow-hidden px-8 pt-8 lg:pt-12">
        <h1
          className="text-[20vw] lg:text-[16rem] font-bold text-white uppercase leading-[0.85] -tracking-wider"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          TEACHING ARTIST PORTAL
        </h1>
      </div>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-12">
        <p className="text-center text-lg lg:text-xl text-white/80 max-w-lg mb-10">
          Sign in to manage your profile, work orders, and invoices with InterACT English.
        </p>

        {/* Login form — white card */}
        <div className="w-full max-w-sm bg-white rounded-full px-8 py-4 flex items-center gap-3 shadow-lg mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            placeholder="your@email.com"
          />
        </div>

        <div className="w-full max-w-sm bg-white rounded-full px-8 py-4 flex items-center gap-3 shadow-lg mb-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            placeholder="Password"
          />
        </div>

        {error && (
          <p className="text-sm text-white font-semibold mb-4 bg-red-500/30 px-4 py-2 rounded-full">{error}</p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleLogin}
          className="w-full max-w-sm rounded-full border-2 border-white bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-[#E91E8C] disabled:opacity-50"
        >
          {loading ? "Signing in..." : "SIGN IN"}
        </button>

        <p className="mt-8 text-xs text-white/50">
          Admin? <Link href="/auth/admin" className="text-white underline hover:text-white/80">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
