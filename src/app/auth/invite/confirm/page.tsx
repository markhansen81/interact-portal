"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function InviteConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  // Extract session from URL hash (implicit flow from Supabase invite link)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.substring(1);
    if (!hash) { setSessionReady(true); return; }
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setError("Invite link expired. Please ask for a new invitation.");
          else window.history.replaceState(null, "", window.location.pathname);
          setSessionReady(true);
        });
    } else {
      setSessionReady(true);
    }
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
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

          <h2 className="text-white font-bold text-xl mb-1">Welcome to InterACT!</h2>
          <p className="text-white/70 text-sm mb-8">Set a password to secure your account.</p>

          <form onSubmit={handleSetPassword} className="flex flex-col gap-5" aria-busy={!sessionReady}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 pr-8 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-0 top-3 text-white/50 hover:text-white">
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="block w-full border-b-2 border-white/50 bg-transparent px-0 py-3 pr-8 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none transition-colors"
                  placeholder="Repeat your password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-0 top-3 text-white/50 hover:text-white">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
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
                {loading ? "Setting up..." : "Create password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
