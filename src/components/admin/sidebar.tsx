"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [{ href: "/admin", label: "Home" }],
  },
  {
    label: "Staffing",
    items: [
      { href: "/admin/teaching-artists", label: "Teaching Artists" },
      { href: "/admin/onboarding", label: "Onboarding" },
      { href: "/admin/training", label: "Training" },
      { href: "/admin/availability", label: "Availability" },
      { href: "/admin/lanes-planes", label: "Lanes & Planes" },
    ],
  },
  {
    label: "Projects",
    items: [
      { href: "/admin/jobs", label: "School Projects" },
      { href: "/admin/projects", label: "TA Assignments" },
      { href: "/admin/work-orders", label: "Work Orders" },
      { href: "/admin/church", label: "CRM Pipeline" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices" },
      { href: "/admin/services", label: "Services & Rates" },
      { href: "/admin/insurance-orders", label: "Insurance" },
    ],
  },
  {
    items: [
      { href: "/admin/messages", label: "Messages" },
      { href: "/admin/templates", label: "Templates" },
      { href: "/admin/contracts", label: "Contracts" },
    ],
  },
  {
    items: [{ href: "/admin/users", label: "Admin Users" }],
  },
];

const superAdminItems: NavItem[] = [
  { href: "/admin/datev-settings", label: "DATEV Settings" },
  { href: "/admin/system-health", label: "System Health" },
];

export function AdminSidebar({
  isSuperAdmin = false,
}: {
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  const allSections: NavSection[] = isSuperAdmin
    ? [
        ...navSections,
        {
          label: "System",
          items: superAdminItems,
        },
      ]
    : navSections;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      {/* Logo */}
      <div className="px-6 pt-6 pb-8">
        <span className="text-lg font-bold tracking-tight text-neutral-900">
          InterACT
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-6 pb-6">
        {allSections.map((section, sectionIdx) => (
          <div key={section.label || `section-${sectionIdx}`} className="mb-6">
            {section.label && (
              <p className="mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block py-1.5 text-sm transition-colors ${
                      isActive
                        ? "font-semibold text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span
                      className={
                        isActive
                          ? "border-b-2 border-neutral-900 pb-0.5"
                          : ""
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-neutral-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/admin/users"
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Settings"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          </svg>
        </Link>
        <Link
          href="/admin/messages"
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Help"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
