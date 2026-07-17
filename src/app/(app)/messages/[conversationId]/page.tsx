"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

interface User { id: string; name: string | null; email: string; image: string | null; }
interface DirectMessage { id: string; content: string; senderId: string; createdAt: string; sender: User; }

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    // Fetch messages and conversation in parallel
    const [msgRes, convRes] = await Promise.all([
      fetch(`/api/conversations/${conversationId}/messages`),
      fetch(`/api/conversations`),
    ]);
    const data: DirectMessage[] = await msgRes.json();
    const convs = await convRes.json();
    setMessages(data);
    // Prefer conversation metadata (works even before either party has sent a message)
    const conv = convs.find((c: { id: string; user1: User; user2: User; user1Id: string }) => c.id === conversationId);
    if (conv && session?.user?.id) {
      setOtherUser(conv.user1Id === session.user.id ? conv.user2 : conv.user1);
    } else if (data.length > 0) {
      // Fallback: derive from messages if conversation not found
      const other = data.find((m) => m.senderId !== session?.user?.id)?.sender;
      if (other) setOtherUser(other);
    }
  }, [conversationId, session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  // SSE for real-time messages
  useEffect(() => {
    const es = new EventSource(`/api/conversations/${conversationId}/sse`);
    es.onmessage = (e) => {
      try {
        const msg: DirectMessage = JSON.parse(e.data);
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      } catch { /* ignore ping */ }
    };
    return () => es.close();
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    // Optimistic update
    const tempMsg: DirectMessage = {
      id: `temp-${Date.now()}`, content, senderId: session?.user?.id ?? "",
      createdAt: new Date().toISOString(),
      sender: { id: session?.user?.id ?? "", name: session?.user?.name ?? null, email: session?.user?.email ?? "", image: session?.user?.image ?? null },
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const real: DirectMessage = await res.json();
      setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? real : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInput(content);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const myId = session?.user?.id;

  // Group messages by date
  const grouped: { date: string; msgs: DirectMessage[] }[] = [];
  messages.forEach((msg) => {
    const d = format(new Date(msg.createdAt), "MMMM d, yyyy");
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  });

  return (
    <div className="h-full flex flex-col" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/messages" className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted" />
        </Link>
        {otherUser ? (
          <>
            <div className="relative">
              <Avatar name={otherUser.name} image={otherUser.image} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-[var(--bg-card)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{otherUser.name ?? otherUser.email}</p>
              <p className="text-[10px] text-subtle">Online</p>
            </div>
          </>
        ) : (
          <div className="w-32 h-5 rounded bg-elevated animate-pulse" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-[10px] font-semibold text-subtle px-2">{date}</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <div className="space-y-1">
              {msgs.map((msg, i) => {
                const isMine = msg.senderId === myId;
                const prevMsg = msgs[i - 1];
                const showAvatar = !isMine && msg.senderId !== prevMsg?.senderId;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {!isMine && (
                      <div className="w-7 h-7 shrink-0">
                        {showAvatar && <Avatar name={msg.sender.name} image={msg.sender.image} size="xs" />}
                      </div>
                    )}
                    <div className={`max-w-[72%] group relative ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "rounded-br-sm text-white"
                          : "rounded-bl-sm text-foreground"
                      }`}
                        style={{
                          background: isMine ? "var(--accent)" : "var(--bg-elevated)",
                        }}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-subtle mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div className="flex items-end gap-3">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={`Message ${otherUser?.name ?? "…"}`} rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none max-h-32"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", lineHeight: "1.5" }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shrink-0 disabled:opacity-40"
            style={{ background: "var(--accent)" }}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
