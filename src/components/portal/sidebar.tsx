"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  onboarding_status: string;
}

const navItems = [
  { href: "/portal", label: "Dashboard", icon: "home" },
  { href: "/portal/profile", label: "My Profile", icon: "user" },
  { href: "/portal/documents", label: "Documents", icon: "folder" },
  { href: "/portal/work-orders", label: "Work Orders", icon: "file-text" },
  { href: "/portal/invoices", label: "Invoices", icon: "receipt" },
  { href: "/portal/expenses", label: "Expenses", icon: "credit-card" },
  { href: "/portal/availability", label: "Availability", icon: "calendar" },
  { href: "/portal/messages", label: "Messages", icon: "message" },
];

const iconPaths: Record<string, React.ReactNode> = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />,
  folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  "file-text": <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  receipt: <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM16 8H8M16 12H8M16 16H8" />,
  calendar: <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" />,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  "credit-card": <path d="M1 4h22v16H1zM1 10h22" />,
};

export function PortalSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <aside className="flex w-[260px] flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 border-b border-zinc-200/80 px-6 dark:border-zinc-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
          <span className="text-xs font-bold text-white dark:text-zinc-900">iA</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">InterACT</p>
          <p className="text-[11px] text-zinc-400">Teaching Artist Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
              }`}
            >
              <svg
                className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-zinc-700 dark:text-zinc-200" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                {iconPaths[item.icon]}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-zinc-200/80 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-[11px] text-zinc-400">Teaching Artist</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
