"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/portal");
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

          <h2 className="text-white font-bold text-xl mb-1">Set a new password</h2>
          <p className="text-white/70 text-sm mb-8">Choose a strong password for your account.</p>

          <form onSubmit={handleUpdate} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <p className="text-sm text-white font-medium bg-black/20 px-4 py-2 rounded">{error}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-[#E91E8C] px-8 py-3 text-sm font-bold uppercase tracking-widest rounded-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Set password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
