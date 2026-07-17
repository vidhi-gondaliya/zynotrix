"use client";
import { useEffect } from "react";

export function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("zynotrix-theme");
    let theme = "dark";
    try {
      const parsed = JSON.parse(stored ?? "{}");
      theme = parsed?.state?.theme ?? "dark";
    } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return null;
}
