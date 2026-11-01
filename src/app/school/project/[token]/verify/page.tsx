"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

export default function SchoolVerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || `/school/project/${token}`;
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/school/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to send code");
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/school/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, otp }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Verification failed");
      return;
    }

    // Redirect to original destination (e.g. info-form) or project root
    router.replace(nextUrl);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600 text-xl font-bold text-white">
            IA
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">School Portal</h1>
          <p className="mt-1 text-sm text-neutral-500">InterACT English</p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <p className="mb-5 text-center text-sm text-neutral-600">
                Enter the email address associated with this project to receive a one-time access code.
              </p>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="block w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="teacher@school.de"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <p className="mb-5 text-center text-sm text-neutral-600">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below. The code expires in 15 minutes.
              </p>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="block w-full rounded-lg border border-neutral-300 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-neutral-900 placeholder:text-neutral-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="000000"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & continue"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(null); }}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
