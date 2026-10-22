interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full">{children}</table>
    </div>
  );
}

export function TableHeader({ children, className = "" }: TableProps) {
  return <thead className={className}>{children}</thead>;
}

export function TableRow({
  children,
  className = "",
}: TableProps) {
  return (
    <tr className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}

export function TableHeaderCell({ children, className = "", colSpan }: TableCellProps) {
  return (
    <th
      colSpan={colSpan}
      className={`py-3 px-0 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 border-b border-neutral-200 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = "", colSpan }: TableCellProps) {
  return (
    <td colSpan={colSpan} className={`py-4 px-0 text-sm text-neutral-900 ${className}`}>
      {children}
    </td>
  );
}
