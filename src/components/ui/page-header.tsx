interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  description?: string;
}

export function PageHeader({ title, action, description }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
