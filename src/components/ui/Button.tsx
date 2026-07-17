"use client";
import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "glass";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, iconRight, children, className = "", disabled, ...props }, ref) => {

    const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap";

    const variants = {
      primary:   "bg-accent text-white hover:bg-accent-hover active:scale-[0.97] shadow-glow-btn hover:shadow-glow",
      secondary: "bg-secondary text-white hover:bg-secondary-hover active:scale-[0.97]",
      ghost:     "text-muted hover:text-foreground hover:bg-card-hover active:scale-[0.97]",
      danger:    "bg-danger text-white hover:opacity-90 active:scale-[0.97]",
      outline:   "border border-border-strong text-foreground hover:bg-card-hover hover:border-accent/40 active:scale-[0.97]",
      glass:     "bg-card-hover border border-border text-foreground hover:border-border-strong active:scale-[0.97] backdrop-blur-sm",
    };

    const sizes = {
      xs: "text-2xs px-2.5 py-1 h-6",
      sm: "text-xs px-3.5 py-1.5 h-7",
      md: "text-sm px-4.5 py-2 h-9",
      lg: "text-sm px-6 py-2.5 h-11",
    };

    // tailwind doesn't have px-4.5 by default, use inline style
    const paddingMap = { xs: "0.625rem", sm: "0.875rem", md: "1.125rem", lg: "1.5rem" };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        style={{ paddingLeft: paddingMap[size], paddingRight: paddingMap[size] }}
        {...props}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : icon && <span className="shrink-0">{icon}</span>
        }
        {children}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
