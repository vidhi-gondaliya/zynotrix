"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Hash, Plus, Smile, X, Lock, Users, UserPlus, Search, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useSSE } from "@/hooks/useSSE";
import { useChat } from "@/store/useChat";
import type { Channel, Message, ChannelMember } from "@/types";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

function formatMessageDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
}

// ── Add Members Modal ─────────────────────────────────────────────────────────
function AddMembersModal({ channel, onClose, onMembersUpdated }: {
  channel: Channel;
  onClose: () => void;
  onMembersUpdated: (members: ChannelMember[]) => void;
}) {
  const [users, setUsers]   = useState<{ id: string; name: string | null; image: string | null; email: string }[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const currentMemberIds    = new Set((channel.members ?? []).map((m) => m.userId));

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  const addMember = async (userId: string) => {
    setAdding(userId);
    const res = await fetch(`/api/channels/${channel.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        onMembersUpdated([
          ...(channel.members ?? []),
          { channelId: channel.id, userId, joinedAt: new Date().toISOString(), user: { id: user.id, name: user.name, image: user.image } },
        ]);
      }
      toast.success("Member added");
    } else { toast.error("Failed to add member"); }
    setAdding(null);
  };

  const removeMember = async (userId: string) => {
    const res = await fetch(`/api/channels/${channel.id}/members`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      onMembersUpdated((channel.members ?? []).filter((m) => m.userId !== userId));
      toast.success("Member removed");
    } else { toast.error("Failed to remove member"); }
  };

  const filteredUsers = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,15,0.80)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "0 24px 80px rgba(0,0,0,0.80)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-black text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Manage Members
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Current members */}
        {(channel.members ?? []).length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Current Members ({(channel.members ?? []).length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(channel.members ?? []).map((m) => (
                <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                  style={{ background: "var(--bg-elevated)" }}>
                  <Avatar name={m.user.name} image={m.user.image} size="xs" />
                  <span className="flex-1 text-xs font-semibold text-foreground truncate">{m.user.name}</span>
                  <button onClick={() => removeMember(m.userId)}
                    className="text-subtle hover:text-danger transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add members */}
        <div>
          <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Add Members</p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredUsers.filter((u) => !currentMemberIds.has(u.id)).map((u) => (
              <button key={u.id} onClick={() => addMember(u.id)} disabled={adding === u.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-elevated transition-colors disabled:opacity-50">
                <Avatar name={u.name} image={u.image} size="xs" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                </div>
                <UserPlus className="w-3 h-3 text-subtle" />
              </button>
            ))}
            {filteredUsers.filter((u) => !currentMemberIds.has(u.id)).length === 0 && (
              <p className="text-[11px] text-subtle text-center py-2">All users already added</p>
            )}
          </div>
        </div>

        <button onClick={onClose}
          className="w-full mt-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}>Done</button>
      </motion.div>
    </motion.div>
  );
}

// ── New Channel Modal ─────────────────────────────────────────────────────────
function NewChannelModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (ch: Channel) => void;
}) {
  const [users, setUsers]   = useState<{ id: string; name: string | null; image: string | null; email: string }[]>([]);
  const [name, setName]     = useState("");
  const [desc, setDesc]     = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  const toggleMember = (id: string) => {
    setMemberIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim().toLowerCase().replace(/\s+/g, "-"), description: desc.trim(), isPrivate, memberIds }),
      });
      if (res.ok) {
        const ch: Channel = await res.json();
        onCreated(ch);
        onClose();
        toast.success(`#${ch.name} created`);
      } else { toast.error("Failed to create channel"); }
    } finally { setCreating(false); }
  };

  const filteredUsers = users.filter((u) =>
    u.id !== session?.user?.id &&
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,15,0.80)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "0 24px 80px rgba(0,0,0,0.80)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Hash className="w-4 h-4 text-accent" /> Create Channel
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <form onSubmit={create} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1.5">Channel Name</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}>
              <Hash className="w-3.5 h-3.5 text-muted shrink-0" />
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. design, engineering"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle outline-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1.5">Description <span className="opacity-50 font-normal">(optional)</span></label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this channel for?"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none"
              style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
          </div>

          {/* Private toggle */}
          <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl transition-all"
            style={{ background: isPrivate ? "rgba(157,107,255,0.08)" : "var(--bg-elevated)", border: `1.5px solid ${isPrivate ? "var(--accent)" : "var(--border)"}` }}>
            <div onClick={() => setIsPrivate((v) => !v)}
              className="w-9 h-5 rounded-full relative transition-all shrink-0"
              style={{ background: isPrivate ? "var(--accent)" : "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: isPrivate ? "calc(100% - 18px)" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: isPrivate ? "var(--accent)" : "var(--text-muted)" }} />
                <span className="text-xs font-bold" style={{ color: isPrivate ? "var(--accent)" : "var(--text-muted)" }}>Private Channel</span>
              </div>
              <p className="text-[10px] text-subtle">Only invited members can see and join</p>
            </div>
          </label>

          {/* Member picker (shown when private) */}
          <AnimatePresence>
            {isPrivate && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1.5">Add Members</label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-elevated transition-colors"
                      style={{ background: memberIds.includes(u.id) ? "var(--accent-muted)" : "transparent" }}>
                      <input type="checkbox" className="sr-only" checked={memberIds.includes(u.id)}
                        onChange={() => toggleMember(u.id)} />
                      <Avatar name={u.name} image={u.image} size="xs" />
                      <span className="flex-1 text-xs font-semibold text-foreground truncate">{u.name}</span>
                      {memberIds.includes(u.id) && <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>✓</span>}
                    </label>
                  ))}
                </div>
                {memberIds.length > 0 && (
                  <p className="text-[10px] text-accent mt-1">{memberIds.length} member{memberIds.length !== 1 ? "s" : ""} selected</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || creating}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)" }}>
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChannelPage({ params }: { params: { channelId: string } }) {
  const { data: session } = useSession();
  const { channels, messages, setChannels, setMessages, addMessage } = useChat();
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const router    = useRouter();

  useEffect(() => {
    if (!channels.length) {
      fetch("/api/channels").then((r) => r.json()).then(setChannels).catch(() => {});
    }
  }, [channels.length, setChannels]);

  useEffect(() => {
    fetch(`/api/channels/${params.channelId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(params.channelId, data))
      .catch(() => {});
  }, [params.channelId, setMessages]);

  useSSE(`/api/channels/${params.channelId}/sse`, useCallback((data: unknown) => {
    const event = data as { type: string; payload: Message };
    if (event.type === "message" && event.payload.authorId !== session?.user?.id) {
      addMessage(params.channelId, event.payload);
    }
  }, [addMessage, params.channelId, session?.user?.id]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[params.channelId]?.length]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !session?.user?.id) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      channelId: params.channelId,
      authorId: session.user.id,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      author: { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? "", image: session.user.image ?? null, role: "MEMBER", createdAt: "" },
    };
    addMessage(params.channelId, optimistic);

    const res = await fetch(`/api/channels/${params.channelId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) toast.error("Failed to send message");
    setSending(false);
  };

  const channelMessages = messages[params.channelId] ?? [];
  const currentChannel  = channels.find((c: Channel) => c.id === params.channelId);

  const updateChannelMembers = (members: ChannelMember[]) => {
    setChannels(channels.map((c: Channel) => c.id === params.channelId ? { ...c, members } : c));
  };

  return (
    <div className="flex" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* ── Channel Sidebar ── */}
      <div className="w-56 flex flex-col shrink-0"
        style={{ background: "var(--bg-elevated)", borderRight: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold text-subtle uppercase tracking-widest">Channels</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.map((ch: Channel) => (
            <Link key={ch.id} href={`/chat/${ch.id}`}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors mx-1 rounded-xl ${
                ch.id === params.channelId
                  ? "text-foreground"
                  : "text-muted hover:text-foreground hover:bg-card"
              }`}
              style={ch.id === params.channelId ? { background: "var(--accent-muted)", color: "var(--accent)" } : {}}>
              {ch.isPrivate
                ? <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: ch.id === params.channelId ? "var(--accent)" : undefined }} />
                : <Hash className="w-3.5 h-3.5 shrink-0" />
              }
              <span className="truncate flex-1">{ch.name}</span>
              {ch.isPrivate && <Lock className="w-2.5 h-2.5 shrink-0 opacity-50" />}
            </Link>
          ))}
        </div>
        <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={() => setShowNewChannel(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground rounded-xl hover:bg-card transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Channel
          </button>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 flex items-center px-5 gap-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          {currentChannel?.isPrivate
            ? <Lock className="w-4 h-4 text-muted" />
            : <Hash className="w-4 h-4 text-muted" />
          }
          <span className="text-sm font-bold text-foreground">{currentChannel?.name ?? "channel"}</span>
          {currentChannel?.description && (
            <><span className="text-border">|</span><span className="text-xs text-muted truncate">{currentChannel.description}</span></>
          )}
          <div className="flex-1" />

          {/* Member avatars */}
          {currentChannel?.members && currentChannel.members.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-1">
              {currentChannel.members.slice(0, 4).map((m) => (
                <div key={m.userId} className="rounded-full ring-2 ring-card">
                  <Avatar name={m.user.name} image={m.user.image} size="xs" />
                </div>
              ))}
              {(currentChannel.members.length > 4) && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  +{currentChannel.members.length - 4}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setShowAddMembers(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-elevated"
            style={{ color: "var(--text-muted)" }}>
            <Users className="w-3.5 h-3.5" />
            {currentChannel?._count?.members ?? 0}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          <AnimatePresence initial={false}>
            {channelMessages.map((msg, i) => {
              const isOwn    = msg.authorId === session?.user?.id;
              const prevMsg  = channelMessages[i - 1];
              const showAvatar = !prevMsg || prevMsg.authorId !== msg.authorId ||
                (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 300000;

              return (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                  className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""} ${showAvatar ? "mt-3" : ""}`}>
                  {showAvatar
                    ? <Avatar name={msg.author?.name} image={msg.author?.image} size="sm" className="shrink-0 mb-0.5" />
                    : <div className="w-7 shrink-0" />
                  }
                  <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {showAvatar && (
                      <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-semibold text-foreground">{msg.author?.name?.split(" ")[0] ?? "User"}</span>
                        <span className="text-[10px] text-subtle">{formatMessageDate(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? "gradient-bg text-white rounded-br-sm"
                        : "text-foreground rounded-bl-sm"
                    }`}
                      style={isOwn ? {} : { background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-all"
            style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <button className="p-1 text-subtle hover:text-muted transition-colors">
              <Smile className="w-4 h-4" />
            </button>
            <textarea ref={inputRef}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle resize-none focus:outline-none max-h-32 min-h-[24px]"
              placeholder={`Message #${currentChannel?.name ?? "channel"}…`}
              rows={1} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 128)}px`; }}
            />
            <Button size="sm" onClick={sendMessage} disabled={!input.trim()} loading={sending} icon={<Send className="w-3.5 h-3.5" />}>
              Send
            </Button>
          </div>
          <p className="text-[10px] text-subtle mt-1 px-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewChannel && (
          <NewChannelModal
            onClose={() => setShowNewChannel(false)}
            onCreated={(ch) => { setChannels([...channels, ch]); router.push(`/chat/${ch.id}`); }} />
        )}
        {showAddMembers && currentChannel && (
          <AddMembersModal
            channel={currentChannel}
            onClose={() => setShowAddMembers(false)}
            onMembersUpdated={updateChannelMembers} />
        )}
      </AnimatePresence>
    </div>
  );
}
