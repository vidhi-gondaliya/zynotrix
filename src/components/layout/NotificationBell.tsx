"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSSE } from "@/hooks/useSSE";
import { useNotifications } from "@/store/useNotifications";
import type { Notification } from "@/types";
import toast from "react-hot-toast";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { setNotifications, addNotification } = useNotifications();

  const loaded = useNotifications((s) => s.loaded);

  // Load initial notifications only once per session (Zustand persists across nav)
  useEffect(() => {
    if (!session?.user?.id || loaded) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data))
      .catch(() => {});
  }, [session?.user?.id, loaded, setNotifications]);

  // Subscribe to SSE for real-time notifications
  useSSE(
    session?.user?.id ? "/api/notifications/sse" : null,
    (data: unknown) => {
      const event = data as { type: string; payload: Notification };
      if (event.type === "notification") {
        addNotification(event.payload);
        toast(event.payload.title, {
          icon: "🔔",
          style: {
            background: "var(--bg-card)",
            color: "var(--text-foreground)",
            border: "1px solid var(--border)",
            fontSize: "13px",
          },
        });
      }
    }
  );

  return <>{children}</>;
}
