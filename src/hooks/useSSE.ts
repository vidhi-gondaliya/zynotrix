"use client";
import { useEffect, useRef } from "react";

export function useSSE(url: string | null, onMessage: (data: unknown) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url) return;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(url);
      es.onmessage = (e) => {
        try {
          onMessageRef.current(JSON.parse(e.data));
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && es.readyState === EventSource.CLOSED) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      es.close();
      clearTimeout(retryTimeout);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [url]);
}
