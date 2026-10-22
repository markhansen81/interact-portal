interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = "", noPadding = false }: CardProps) {
  return (
    <div
      className={`border border-neutral-200 bg-white rounded-sm ${
        noPadding ? "" : "p-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}
