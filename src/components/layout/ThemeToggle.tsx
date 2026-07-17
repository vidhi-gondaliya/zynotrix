"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/store/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex items-center justify-center w-8 h-8 rounded-xl text-muted hover:text-foreground hover:bg-card-hover transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
      {isDark
        ? <Sun  className="w-4 h-4 transition-transform duration-300 rotate-0" />
        : <Moon className="w-4 h-4 transition-transform duration-300 rotate-0" />
      }
    </button>
  );
}
