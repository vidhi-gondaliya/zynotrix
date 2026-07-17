"use client";
import { useState, useCallback } from "react";

export function useClaude() {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      setStreaming(true);
      setText("");
      setError(null);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let acc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setText(acc);
        }

        return acc;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setStreaming(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setText("");
    setError(null);
    setStreaming(false);
  }, []);

  return { ask, text, streaming, error, reset };
}
