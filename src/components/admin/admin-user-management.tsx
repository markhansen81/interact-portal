"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export function AdminUserManagement({ admins, currentUserId }: { admins: Admin[]; currentUserId: string }) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);
  const router = useRouter();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.endsWith("@interactenglish.de")) {
      setError("Only @interactenglish.de email addresses can be invited as admins.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to invite");
        setLoading(false);
        return;
      }

      setSuccess({ email, password: data.tempPassword });
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function handleClose() {
    setShowInvite(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setError(null);
    setSuccess(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Invite Admin
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Invite Admin User
            </h3>
            <p className="mt-1 text-sm text-zinc-500">Only @interactenglish.de emails allowed.</p>

            {success ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Admin account created!</p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Credentials:</p>
                  <p className="mt-1 text-sm font-mono text-zinc-900 dark:text-zinc-100">Email: {success.email}</p>
                  <p className="text-sm font-mono text-zinc-900 dark:text-zinc-100">Password: {success.password}</p>
                </div>
                <p className="text-xs text-zinc-400">Share these credentials securely. They should change their password after first login.</p>
                <button onClick={handleClose}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@interactenglish.de"
                    className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={handleClose}
                    className="rounded-xl px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
                    {loading ? "Inviting..." : "Send Invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin list */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">User</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Email</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Added</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : admin.email.split("@")[0]}
                  </p>
                </td>
                <td className="px-5 py-3 text-sm text-zinc-500">{admin.email}</td>
                <td className="px-5 py-3 text-sm text-zinc-400">
                  {new Date(admin.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-right">
                  {admin.id === currentUserId && (
                    <span className="text-[11px] text-zinc-400">You</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
