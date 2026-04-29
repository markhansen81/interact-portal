"use client";

import { createClient } from "@/lib/supabase/client";

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
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm text-zinc-500">
        Welcome, <span className="font-medium text-zinc-900 dark:text-zinc-50">{displayName}</span>
        <span className="ml-3 inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Level {profile.pay_level}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </header>
  );
}
