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
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ask Colliq</h2>
            <p className="text-[11px] text-muted">Ask anything about your projects, tasks & team</p>
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
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-glow mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">How can I help?</h3>
            <p className="text-sm text-muted mb-6 text-center max-w-sm">
              Ask me anything about your projects, tasks, team performance, or get AI-powered insights.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-xs p-3 glass-card hover:bg-card-hover transition-colors rounded-xl text-muted hover:text-foreground"
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
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-card border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all">
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
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            loading={streaming}
            icon={<Send className="w-4 h-4" />}
          >
            Send
          </Button>
        </div>
        <p className="text-[10px] text-subtle mt-1.5">Powered by Claude · Enter to send</p>
      </div>
    </div>
  );
}
