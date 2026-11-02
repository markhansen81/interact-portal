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
    <div className="flex min-h-screen bg-[#E91E8C]">
      {/* Left side — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16">
        <h1
          className="text-6xl font-bold text-white uppercase leading-none"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          TEACHING<br />ARTIST<br />PORTAL
        </h1>
        <p className="mt-6 text-lg text-white/70 max-w-md">
          Manage your profile, work orders, and invoices with InterACT English.
        </p>
        <div className="mt-10">
          <a
            href="mailto:connect@interactenglish.de"
            className="text-white font-bold underline underline-offset-4 text-base uppercase tracking-wide"
          >
            connect@interactenglish.de
          </a>
          <p className="mt-2 text-white/70 text-base">
            +49 (0) 30 20 33 97 02
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 lg:bg-white/10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <h1
              className="text-4xl font-bold text-white uppercase"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              TEACHING ARTIST PORTAL
            </h1>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-sm text-white font-medium bg-black/20 px-4 py-2 rounded">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-[#E91E8C] px-10 py-3 text-sm font-bold uppercase tracking-widest rounded-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>

          <p className="mt-10 text-xs text-white/50">
            Admin?{" "}
            <Link href="/auth/admin" className="text-white underline hover:text-white/80">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
