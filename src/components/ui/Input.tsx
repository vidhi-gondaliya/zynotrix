"use client";
import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-muted mb-2 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none transition-colors group-focus-within:text-accent">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-10 rounded-xl px-4 py-2.5 text-sm text-foreground
              bg-elevated border
              placeholder:text-subtle
              outline-none transition-all duration-200
              focus:bg-card focus:ring-2 focus:ring-accent/25 focus:border-accent/60
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-danger/60 focus:ring-danger/20 focus:border-danger" : "border-border hover:border-border-strong"}
              ${icon ? "pl-10" : ""}
              ${iconRight ? "pr-10" : ""}
              ${className}
            `}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
