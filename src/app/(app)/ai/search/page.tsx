"use client";
import { useState } from "react";
import { Search, Sparkles, MessageSquare, FileText, Calendar, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useClaude } from "@/hooks/useClaude";
import { motion } from "framer-motion";

const SCOPES = [
  { value: "ALL", label: "All", icon: Sparkles },
  { value: "MESSAGE", label: "Chats", icon: MessageSquare },
  { value: "DOCUMENT", label: "Docs", icon: FileText },
  { value: "MEETING", label: "Meetings", icon: Calendar },
  { value: "TASK", label: "Tasks", icon: CheckSquare },
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
    <div className="p-6 animate-fade-in">
      {/* Search box */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-elevated border border-border rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
              placeholder="Search across all your chats, meetings, tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            />
          </div>
          <Button onClick={search} loading={streaming} icon={<Sparkles className="w-4 h-4" />}>
            Search
          </Button>
        </div>

        {/* Scope filter */}
        <div className="flex gap-2">
          {SCOPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${scope === value
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-muted hover:text-foreground hover:bg-elevated"
                }`}
            >
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
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Colliq Answer</span>
            {streaming && <span className="text-xs text-accent animate-pulse">Searching...</span>}
          </div>
          <div
            className="text-sm text-muted prose-ai leading-relaxed"
            dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br/>") }}
          />
        </motion.div>
      )}

      {!text && !streaming && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-4 shadow-glow">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Search with Colliq</h3>
          <p className="text-xs text-muted max-w-xs">
            Search across all your messages, documents, meetings, and tasks using natural language.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {["find messages about design", "meetings last week", "overdue tasks", "client feedback"].map((ex) => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted hover:text-foreground hover:border-accent/50 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
