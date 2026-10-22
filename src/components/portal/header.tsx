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
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-8">
      <div className="flex items-center gap-3">
        <p className="text-sm text-neutral-500">
          <span className="hidden md:inline">Welcome back, </span>
          <span className="font-semibold text-neutral-900">{displayName}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 md:inline-flex">
          Level {profile.pay_level}
        </span>
        <NotificationBell />
        <button
          onClick={handleSignOut}
          className="ml-1 px-3 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
