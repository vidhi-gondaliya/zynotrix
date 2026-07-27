"use client";
import { useState } from "react";
import { Search, Sparkles, MessageSquare, FileText, Calendar, CheckSquare, Loader2 } from "lucide-react";
import { useClaude } from "@/hooks/useClaude";
import { motion } from "framer-motion";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

const SCOPES = [
  { value: "ALL",      label: "All",      icon: Sparkles     },
  { value: "MESSAGE",  label: "Chats",    icon: MessageSquare },
  { value: "DOCUMENT", label: "Docs",     icon: FileText     },
  { value: "MEETING",  label: "Meetings", icon: Calendar     },
  { value: "TASK",     label: "Tasks",    icon: CheckSquare  },
];

export default function AISearchPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("ALL");
  const { ask, text, streaming } = useClaude();

  const search = () => {
    if (!query.trim() || streaming) return;
    ask("/api/ai/search", { query, scope });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)", boxShadow: "0 4px 20px rgba(139,92,246,0.40)" }}>
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[18px] font-black" style={{
            background: "linear-gradient(135deg, var(--text-foreground) 0%, #8B5CF6 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.03em",
          }}>AI Search</h1>
          <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Search across chats, meetings, tasks, and docs</p>
        </div>
      </div>

      {/* Search box */}
      <div className="rounded-[18px] p-4 mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 rounded-[12px] px-4 py-2.5 transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.50)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(139,92,246,0.10)"; }}
            onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              className="flex-1 bg-transparent text-[13px] focus:outline-none"
              style={{ color: "var(--text-foreground)" }}
              placeholder="Search across all chats, meetings, tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            />
          </div>
          <button
            onClick={search}
            disabled={!query.trim() || streaming}
            className="flex items-center gap-2 h-10 px-4 rounded-[12px] text-[13px] font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.40)",
            }}>
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Search
          </button>
        </div>

        {/* Scope filter */}
        <div className="flex gap-1.5 flex-wrap">
          {SCOPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all"
              style={{
                background: scope === value ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))" : "transparent",
                color: scope === value ? "#8B5CF6" : "var(--text-muted)",
                border: `1px solid ${scope === value ? "rgba(139,92,246,0.30)" : "transparent"}`,
              }}>
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {(text || streaming) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] p-5"
          style={{ background: "var(--bg-card)", border: "1px solid rgba(139,92,246,0.25)", boxShadow: "0 4px 24px rgba(139,92,246,0.10)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-[13px] font-black" style={{ color: "var(--text-foreground)" }}>AI Results</span>
            {streaming && (
              <span className="text-[11px] font-semibold animate-pulse" style={{ color: "#8B5CF6" }}>Searching…</span>
            )}
          </div>
          {text ? (
            <MarkdownRenderer content={text} />
          ) : (
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#8B5CF6", animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#8B5CF6", animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#8B5CF6", animationDelay: "300ms" }} />
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!text && !streaming && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-16 gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl scale-150 opacity-15"
              style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", filter: "blur(20px)" }} />
            <div className="w-16 h-16 rounded-[20px] flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)", boxShadow: "0 8px 32px rgba(139,92,246,0.40)" }}>
              <Search className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-[15px] font-black" style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em" }}>
            Search your workspace
          </p>
          <p className="text-[12px] text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
            Ask natural language questions and find anything across tasks, meetings, documents, and chats.
          </p>
        </motion.div>
      )}
    </div>
  );
}
