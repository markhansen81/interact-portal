"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset/confirm`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-[#E91E8C]">
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
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 lg:bg-white/10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <h1
              className="text-4xl font-bold text-white uppercase"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              TEACHING ARTIST PORTAL
            </h1>
          </div>

          {sent ? (
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-2">Check your inbox</p>
              <p className="text-white/70 text-sm mb-8">
                We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <Link href="/auth/login" className="text-white underline text-sm hover:text-white/80">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-white font-bold text-xl mb-1">Reset your password</h2>
              <p className="text-white/70 text-sm mb-8">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleReset} className="flex flex-col gap-5">
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

                {error && (
                  <p className="text-sm text-white font-medium bg-black/20 px-4 py-2 rounded">{error}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Link href="/auth/login" className="text-white/60 text-xs hover:text-white transition-colors">
                    Back to sign in
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-white text-[#E91E8C] px-8 py-3 text-sm font-bold uppercase tracking-widest rounded-sm hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send link"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
