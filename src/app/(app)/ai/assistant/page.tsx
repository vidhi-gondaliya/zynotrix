"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useClaude } from "@/hooks/useClaude";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "What are the high-priority tasks this week?",
  "Summarize the current project status",
  "What tasks are overdue?",
  "Generate a quick standup summary",
];

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const { ask, text, streaming, reset } = useClaude();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, text]);

  const sendMessage = async (content?: string) => {
    const msg = content ?? input.trim();
    if (!msg || streaming) return;
    setInput("");

    const newHistory = [...history, { role: "user" as const, content: msg }];
    setHistory(newHistory);

    const response = await ask("/api/ai/assistant", {
      messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
    });

    if (response) {
      setHistory([...newHistory, { role: "assistant", content: response }]);
    }
    reset();
  };

  const clearChat = () => {
    setHistory([]);
    reset();
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* Header */}
      <div className="px-6 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)", boxShadow: "0 4px 16px rgba(139,92,246,0.40)" }}>
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-black" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}>Ask Colliq</h2>
            <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>AI assistant for your projects, tasks & team</p>
          </div>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {history.length === 0 && !streaming && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="relative mb-6">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-3xl scale-150 opacity-20"
                style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", filter: "blur(20px)" }} />
              <div className="w-20 h-20 rounded-[24px] flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)", boxShadow: "0 8px 40px rgba(139,92,246,0.50), 0 0 0 1px rgba(139,92,246,0.30)" }}>
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-[18px] font-black mb-1" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}>How can I help?</h3>
            <p className="text-[13px] mb-8 text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
              Ask about your projects, tasks, team performance, or get AI-powered insights.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-[12px] p-3.5 rounded-[14px] transition-all"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.40)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)";
                    (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(139,92,246,0.08), var(--bg-card))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {history.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                ${msg.role === "assistant" ? "gradient-bg" : "bg-elevated border border-border"}`}
              >
                {msg.role === "assistant"
                  ? <Bot className="w-3.5 h-3.5 text-white" />
                  : <User className="w-3.5 h-3.5 text-muted" />
                }
              </div>
              <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm
                ${msg.role === "user"
                  ? "gradient-bg text-white rounded-tr-sm"
                  : "glass-card text-foreground rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming response */}
        {streaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="max-w-2xl glass-card rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground">
              {text ? (
                <MarkdownRenderer content={text} />
              ) : (
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
        <div className="flex items-end gap-3">
          <div className="flex-1 rounded-[14px] px-4 py-3 transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
            onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.50)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(139,92,246,0.10)"; }}
            onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <textarea
              className="w-full bg-transparent text-sm text-foreground placeholder:text-subtle resize-none focus:outline-none max-h-32 min-h-[24px]"
              placeholder="Ask Colliq anything…"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
              disabled={streaming}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="flex items-center gap-2 h-10 px-4 rounded-[12px] text-[13px] font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.40)",
            }}>
            <Send className="w-3.5 h-3.5" />
            {streaming ? "…" : "Send"}
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--text-subtle)" }}>Powered by Claude · Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
