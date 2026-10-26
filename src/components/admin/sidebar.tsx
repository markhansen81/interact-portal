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
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
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
                    className={`block py-1 text-sm transition-colors ${
                      isActive
                        ? "font-medium text-neutral-900"
                        : "text-neutral-400 hover:text-neutral-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-neutral-200 px-6 py-4">
        <Link
          href="/admin/users"
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
