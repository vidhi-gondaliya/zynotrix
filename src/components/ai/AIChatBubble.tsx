"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Bot, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "next-auth/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getPageContext(pathname: string): string {
  if (pathname.startsWith("/projects/") && pathname.includes("/board")) {
    const projectId = pathname.split("/")[2];
    return `User is viewing the Kanban board for project ID: ${projectId}.`;
  }
  if (pathname.startsWith("/projects/")) return "User is viewing a project.";
  if (pathname === "/dashboard") return "User is on the main dashboard.";
  if (pathname === "/tasks") return "User is viewing their task list.";
  if (pathname === "/attendance") return "User is on the attendance page.";
  if (pathname === "/rewards") return "User is on the rewards/leaderboard page.";
  if (pathname.startsWith("/chat")) return "User is in the team chat.";
  if (pathname === "/meetings") return "User is viewing meetings.";
  if (pathname === "/documents") return "User is on the documents page.";
  if (pathname.startsWith("/ai/")) return "User is using an AI feature.";
  if (pathname === "/admin") return "User is on the admin panel.";
  return `User is on page: ${pathname}.`;
}

export function AIChatBubble() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const pageCtx = getPageContext(pathname);
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: pageCtx,
        }),
      });
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: accumulated };
          return next;
        });
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, pathname, streaming, input]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Bubble trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), #EC4899)",
              boxShadow: "0 8px 32px var(--accent-glow), 0 0 0 0 var(--accent)",
            }}>
            <Sparkles className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px var(--accent-glow)",
            }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent)20, transparent)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--accent), #EC4899)" }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground">Colliq</p>
                <p className="text-[10px] text-muted">Your smartest colleague</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-elevated">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--accent)20, #EC489920)" }}>
                    <Sparkles className="w-6 h-6" style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="text-sm font-bold text-foreground">Hi {session?.user?.name?.split(" ")[0] ?? "there"}!</p>
                  <p className="text-xs text-muted mt-1">Ask me anything about your projects, tasks, or workspace.</p>
                  <div className="mt-4 space-y-2">
                    {["What tasks are overdue?", "Summarize today's workload", "How is my team performing?"].map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all hover:bg-elevated"
                        style={{ color: "var(--accent)", border: "1px solid var(--accent-glow)", background: "var(--accent-muted)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" ? (
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--accent), #EC4899)" }}>
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <Avatar name={session?.user?.name} image={session?.user?.image} size="sm" />
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                  }`}
                    style={{
                      background: msg.role === "user" ? "var(--accent)" : "var(--bg-elevated)",
                      color: msg.role === "user" ? "#fff" : "var(--text-foreground)",
                    }}>
                    {msg.content || (
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything…"
                  disabled={streaming}
                  className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-subtle"
                />
                <button onClick={() => send()} disabled={!input.trim() || streaming}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: "var(--accent)" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
