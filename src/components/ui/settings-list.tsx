import Link from "next/link";

interface SettingsItem {
  icon?: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  href: string;
}

interface SettingsListProps {
  items: SettingsItem[];
}

export function SettingsList({ items }: SettingsListProps) {
  return (
    <div className="divide-y divide-neutral-100">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-4 py-4 px-4 -mx-4 hover:bg-neutral-50 transition-colors group"
        >
          {item.icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-neutral-400 group-hover:text-neutral-600">
              {item.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-900">
                {item.title}
              </p>
              {item.badge && (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 truncate">
              {item.description}
            </p>
          </div>
          <svg
            className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-neutral-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
