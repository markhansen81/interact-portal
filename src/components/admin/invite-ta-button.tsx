"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteTAButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [payLevel, setPayLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/invite-ta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, payLevel: payLevel ? Number(payLevel) : undefined }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to send invite");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setPayLevel("");
    setSuccess(false);
    setError(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Invite TA
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-sm bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-neutral-900">Invite Teaching Artist</h3>

        {success ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-sm bg-green-50 p-4">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Invitation sent!</p>
                <p className="mt-1 text-sm text-green-700">
                  An email with a sign-in link has been sent to <strong>{email}</strong>. The link expires in 24 hours.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
                placeholder="ta@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Pay level <span className="font-normal text-neutral-400">(optional)</span></label>
              <select
                value={payLevel}
                onChange={(e) => setPayLevel(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Set later</option>
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-sm px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
