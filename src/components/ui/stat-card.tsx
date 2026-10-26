import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  compact?: boolean;
  action?: { label: string; href: string };
}

export function StatCard({ label, value, change, compact, action }: StatCardProps) {
  return (
    <div className="py-2">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-3 font-light tracking-tight text-neutral-900 ${compact ? "text-3xl" : "text-5xl"}`}>{value}</p>
      {change && (
        <p className="mt-2 text-sm text-neutral-400">{change}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-3 inline-block text-sm text-neutral-900 underline hover:text-neutral-600"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
