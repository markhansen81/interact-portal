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
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-sm text-neutral-500">{email}</span>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:underline transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
