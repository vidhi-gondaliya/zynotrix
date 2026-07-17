"use client";
import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-muted mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full bg-card border rounded-lg px-3 py-2 text-sm text-foreground
            placeholder:text-subtle resize-none
            focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${error ? "border-danger focus:ring-danger/30 focus:border-danger" : "border-border"}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
