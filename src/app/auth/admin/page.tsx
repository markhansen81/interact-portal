"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdminLoginForm() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlError = searchParams.get("error");
  const displayError =
    urlError === "domain" ? "Only @interactenglish.de accounts can access the admin portal." :
    urlError === "not_admin" ? "This account does not have admin access." :
    null;

  async function handleGoogleSSO() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin&source=admin`,
        queryParams: { hd: "interactenglish.de" },
      },
    });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setEmailError(error.message);
      setEmailLoading(false);
      return;
    }
    // Check role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setEmailError("Login failed"); setEmailLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setEmailError("This account does not have admin access.");
      setEmailLoading(false);
      return;
    }
    router.push("/admin");
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

      {/* Right side — login */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
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

          {/* Google SSO */}
          <p className="text-[#999] text-sm mb-4">Sign in with your InterACT Google account</p>
          <button
            onClick={handleGoogleSSO}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-sm border border-[#444] bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirecting..." : "Sign in with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#444]" />
            <span className="text-xs text-[#666]">or</span>
            <div className="flex-1 h-px bg-[#444]" />
          </div>

          {/* Email/password */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="w-full rounded-sm border border-[#444] bg-[#333] px-4 py-3 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#666]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full rounded-sm border border-[#444] bg-[#333] px-4 py-3 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#666]"
            />
            {(emailError || displayError) && (
              <p className="text-sm text-red-400">{emailError || displayError}</p>
            )}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full rounded-sm bg-[#E91E8C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c4186f] disabled:opacity-50"
            >
              {emailLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-12 text-xs text-[#666]">
            Teaching Artist? <Link href="/auth/login" className="text-[#E91E8C] hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
