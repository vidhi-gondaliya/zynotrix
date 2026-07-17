interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent" | "outline" | "purple" | "pink" | "cyan";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ children, variant = "default", size = "sm", dot }: BadgeProps) {
  const variants = {
    default: "bg-elevated text-muted border-border",
    success: "bg-success-muted text-success border-success/20",
    warning: "bg-warning-muted text-warning border-warning/20",
    danger:  "bg-danger-muted text-danger border-danger/20",
    info:    "bg-info-muted text-info border-info/20",
    accent:  "bg-accent-muted text-accent border-accent/20",
    outline: "bg-transparent text-muted border-border-strong",
    purple:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pink:    "bg-pink-500/10 text-pink-400 border-pink-500/20",
    cyan:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const dotColors = {
    default: "bg-muted",
    success: "bg-success",
    warning: "bg-warning",
    danger:  "bg-danger",
    info:    "bg-info",
    accent:  "bg-accent",
    outline: "bg-muted",
    purple:  "bg-purple-400",
    pink:    "bg-pink-400",
    cyan:    "bg-cyan-400",
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${variants[variant]} ${sizes[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
