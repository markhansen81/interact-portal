"use client";

import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/shared/notification-bell";

interface Profile {
  first_name: string | null;
  preferred_name: string | null;
  email: string;
  pay_level: number;
}

export function PortalHeader({ profile }: { profile: Profile }) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const displayName =
    profile.preferred_name || profile.first_name || profile.email;

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-zinc-200/80 bg-white px-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <p className="text-sm text-zinc-500">
          Welcome back, <span className="font-semibold text-zinc-900 dark:text-zinc-50">{displayName}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Level {profile.pay_level}
        </span>
        <NotificationBell />
        <button
          onClick={handleSignOut}
          className="ml-1 rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
