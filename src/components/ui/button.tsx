import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-coral text-ink hover:bg-coral-300 active:bg-coral-500 disabled:bg-ink-600 disabled:text-ink-300",
  secondary:
    "bg-ink-700 text-ink-50 hover:bg-ink-600 border border-ink-600",
  ghost:
    "bg-transparent text-ink-50 hover:bg-ink-700",
  outline:
    "border border-ink-600 text-ink-50 hover:bg-ink-700 hover:border-ink-400",
  danger:
    "bg-red-700 text-white hover:bg-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-tight",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-coral",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
