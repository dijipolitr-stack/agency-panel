import * as React from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full bg-ink-700/40 border border-ink-600 rounded-md px-3 py-2 text-sm text-ink-50 " +
  "placeholder:text-ink-400 transition-colors " +
  "focus:border-coral focus:bg-ink-700/60 focus:outline-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(baseField, "h-10", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseField, "min-h-24 leading-relaxed resize-y", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(baseField, "h-10 cursor-pointer appearance-none pr-9", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath stroke='%23C8C0AB' stroke-width='1.5' d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 0.75rem center",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs uppercase tracking-widest text-ink-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-400 leading-relaxed">{hint}</p>}
    </div>
  );
}
