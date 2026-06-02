"use client";

import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/shared/notification-bell";

export function AdminHeader({ email }: { email: string }) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/admin";
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-sm text-zinc-500">{email}</span>
        <button
          onClick={handleSignOut}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
