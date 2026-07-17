"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Search, Plus, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface User { id: string; name: string | null; email: string; image: string | null; role: string; }
interface Conversation {
  id: string;
  user1Id: string; user2Id: string;
  lastMessage: string | null; lastMessageAt: string | null;
  user1: User; user2: User;
  messages: { content: string; createdAt: string; senderId: string; isRead: boolean }[];
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [convs, setConvs]         = useState<Conversation[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [search, setSearch]       = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([c, u]) => { setConvs(c); setUsers(u); setLoading(false); });
  }, []);

  const startConversation = async (userId: string) => {
    const res = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    const conv: Conversation = await res.json();
    setConvs((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    setShowNew(false);
    toast.success("Conversation started!");
    router.push(`/messages/${conv.id}`);
  };

  const myId = session?.user?.id;
  const filteredConvs = convs.filter((c) => {
    const other = c.user1Id === myId ? c.user1 : c.user2;
    return !search || other.name?.toLowerCase().includes(search.toLowerCase()) || other.email?.toLowerCase().includes(search.toLowerCase());
  });
  const filteredUsers = users.filter((u) => {
    if (u.id === myId) return false;
    return !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #EC4899, #9D6BFF)", boxShadow: "0 0 20px rgba(236,72,153,0.40)" }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Direct Messages</h1>
            <p className="text-xs text-subtle">{convs.length} conversation{convs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "var(--accent)" }}>
          <Plus className="w-4 h-4" /> New Message
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
        />
      </div>

      {/* Conversation list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="py-12 text-center text-sm text-subtle">Loading…</div>
        ) : filteredConvs.length === 0 ? (
          <div className="py-12 text-center">
            <MessageCircle className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted">No conversations yet</p>
            <p className="text-xs text-subtle mt-1">Start a new conversation to message a teammate</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredConvs.map((conv, i) => {
              const other = conv.user1Id === myId ? conv.user1 : conv.user2;
              const lastMsg = conv.messages[0];
              const unread = conv.messages.filter((m) => !m.isRead && m.senderId !== myId).length;
              return (
                <motion.div key={conv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/messages/${conv.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-card-hover transition-colors cursor-pointer"
                    style={i < filteredConvs.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                    <div className="relative">
                      <Avatar name={other.name} image={other.image} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${unread > 0 ? "text-foreground" : "text-muted"}`}>
                          {other.name ?? other.email}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-subtle shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground" : "text-subtle"}`}>
                          {lastMsg.senderId === myId ? "You: " : ""}{lastMsg.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-subtle" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowNew(false)}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="text-sm font-bold text-foreground">New Direct Message</h3>
                <p className="text-xs text-subtle mt-0.5">Select a teammate to message</p>
              </div>
              <div className="p-3">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users…" autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {filteredUsers.map((u) => (
                    <button key={u.id} onClick={() => startConversation(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card-hover transition-colors text-left">
                      <Avatar name={u.name} image={u.image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name ?? u.email}</p>
                        <p className="text-[10px] text-subtle truncate">{u.email} · {u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
