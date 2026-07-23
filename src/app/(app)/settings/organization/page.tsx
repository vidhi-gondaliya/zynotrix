"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings, Users, Crown, Shield, UserMinus, Mail,
  Save, Loader2, CheckCircle2, Copy, Check,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";

interface Member {
  role: string; joinedAt: string;
  user: { id: string; name: string | null; email: string; image?: string };
}
interface Org {
  id: string; name: string; slug: string; logo?: string; plan: string; createdAt: string;
  members: Member[];
}

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  OWNER:   { label: "Owner",   color: "#9D6BFF", bg: "rgba(157,107,255,0.1)" },
  ADMIN:   { label: "Admin",   color: "#F43F5E", bg: "rgba(244,63,94,0.1)" },
  MANAGER: { label: "Manager", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  MEMBER:  { label: "Member",  color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
};

function RoleBadge({ role }: { role: string }) {
  const b = ROLE_BADGE[role] ?? ROLE_BADGE.MEMBER;
  return (
    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
      style={{ background: b.bg, color: b.color }}>
      {b.label}
    </span>
  );
}

export default function OrgSettingsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { orgRole?: string })?.orgRole ?? "MEMBER";
  const isAdmin  = hasPermission(userRole, "admin:access");

  const [org,       setOrg]       = useState<Org | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [name,      setName]      = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");
  const [copied,    setCopied]    = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState("MEMBER");
  const [inviting,    setInviting]    = useState(false);
  const [inviteMsg,   setInviteMsg]   = useState("");
  const [removing,    setRemoving]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/organizations/current")
      .then(r => r.json())
      .then(d => { setOrg(d); setName(d.name ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/organizations/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrg(o => o ? { ...o, name: d.name } : o);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const copySlug = () => {
    if (org) navigator.clipboard.writeText(org.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg("");
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (res.ok) {
      setInviteMsg("Invitation sent!");
      setInviteEmail("");
    } else {
      const d = await res.json();
      setInviteMsg(d.error ?? "Failed to send invite");
    }
    setInviting(false);
    setTimeout(() => setInviteMsg(""), 4000);
  };

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId);
    const res = await fetch("/api/organizations/current", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      setOrg(o => o ? { ...o, members: o.members.filter(m => m.user.id !== memberId) } : o);
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--accent-muted)" }}>
          <Settings className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--text-foreground)" }}>
            Organization Settings
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Manage your workspace name, members, and invitations
          </p>
        </div>
      </div>

      {/* General */}
      <section className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--text-foreground)" }}>
          <Settings className="w-3.5 h-3.5" /> General
        </h2>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-subtle)" }}>Workspace Name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            disabled={!isAdmin}
            className="w-full h-[40px] rounded-[10px] text-[13px] font-medium outline-none transition-all"
            style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
              color: "var(--text-foreground)", padding: "0 0.875rem",
              opacity: isAdmin ? 1 : 0.5,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-subtle)" }}>Workspace Slug</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[40px] rounded-[10px] flex items-center px-3.5 text-[13px] font-mono"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}>
              {org?.slug}
            </div>
            <button onClick={copySlug} aria-label="Copy slug"
              className="h-[40px] w-[40px] rounded-[10px] flex items-center justify-center transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                      : <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
            {org?.plan ?? "FREE"}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>plan</span>
        </div>

        {isAdmin && (
          <>
            {error && (
              <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
            )}
            <button onClick={handleSave} disabled={saving || name === org?.name}
              className="flex items-center gap-2 h-[36px] px-4 rounded-[10px] text-[12px] font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : saved ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </button>
          </>
        )}
      </section>

      {/* Invite member */}
      {isAdmin && (
        <section className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold flex items-center gap-2"
            style={{ color: "var(--text-foreground)" }}>
            <Mail className="w-3.5 h-3.5" /> Invite Member
          </h2>
          <div className="flex gap-2">
            <input
              type="email" placeholder="colleague@company.com"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 h-[38px] rounded-[10px] text-[13px] font-medium outline-none px-3.5"
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                color: "var(--text-foreground)",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="h-[38px] rounded-[10px] text-[12px] font-semibold px-2 outline-none"
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                color: "var(--text-foreground)",
              }}>
              <option value="MEMBER">Member</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              className="h-[38px] px-4 rounded-[10px] text-[12px] font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)" }}>
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {inviting ? "Sending…" : "Invite"}
            </button>
          </div>
          {inviteMsg && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs font-semibold"
              style={{ color: inviteMsg.includes("sent") ? "var(--success)" : "var(--danger)" }}>
              {inviteMsg}
            </motion.p>
          )}
        </section>
      )}

      {/* Members */}
      <section className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--text-foreground)" }}>
          <Users className="w-3.5 h-3.5" />
          Members
          <span className="ml-auto text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
            {org?.members.length ?? 0} total
          </span>
        </h2>

        <div className="space-y-2">
          {org?.members.map(m => (
            <motion.div key={m.user.id} layout
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "var(--bg-elevated)" }}>
              <Avatar name={m.user.name ?? m.user.email} image={m.user.image} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-foreground)" }}>
                  {m.user.name ?? m.user.email}
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {m.user.email}
                </p>
              </div>
              <RoleBadge role={m.role} />
              {isAdmin && m.role !== "OWNER" && m.user.id !== session?.user?.id && (
                <button
                  onClick={() => handleRemove(m.user.id)}
                  disabled={removing === m.user.id}
                  aria-label={`Remove ${m.user.name ?? m.user.email}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ background: "var(--danger-muted)", color: "var(--danger)" }}>
                  {removing === m.user.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <UserMinus className="w-3 h-3" />}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
