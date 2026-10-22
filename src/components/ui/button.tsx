import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 active:bg-black",
  secondary:
    "border border-neutral-900 text-neutral-900 bg-transparent hover:bg-neutral-50 active:bg-neutral-100",
  ghost:
    "text-neutral-600 bg-transparent hover:underline hover:text-neutral-900",
  danger:
    "text-red-600 bg-transparent hover:text-red-700 hover:underline",
};

const sizeStyles: Record<string, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-6 py-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
