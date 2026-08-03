"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, Users, Crown, Plus, X, Check, ChevronDown,
  Trash2, Edit3, Save, Key, UserPlus, Shield, Lock, Loader2,
  Search, Eye, EyeOff, Gift,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/api-error";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppUser {
  id: string; name: string | null; email: string;
  image: string | null; role: string; createdAt: string;
}
interface Role {
  id: string; name: string; label: string; color: string;
  description: string; permissions: string[]; isSystem: boolean;
}

type AdminTab = "users" | "roles" | "permissions" | "rewards";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#A78BFA", "#60A5FA", "#34D399", "#FFC107",
  "#FF4466", "#FB923C", "#EC4899", "#6B7280",
];

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role, color }: { role: Role | undefined; color?: string }) {
  const c = color ?? role?.color ?? "#6B7280";
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${c}20`, color: c }}>
      {role?.name === "OWNER" && <Crown className="w-2.5 h-2.5" />}
      {role?.label ?? "Unknown"}
    </span>
  );
}

// ── Role selector dropdown ────────────────────────────────────────────────────
function RoleDropdown({ value, roles, onChange, disabled }: {
  value: string; roles: Role[]; onChange: (r: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = roles.find((r) => r.name === value);

  return (
    <div className="relative">
      <button disabled={disabled} onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-default"
        style={{ background: `${current?.color ?? "#6B7280"}18`, color: current?.color ?? "#6B7280" }}>
        {current?.name === "OWNER" && <Crown className="w-3 h-3" />}
        {current?.label ?? value}
        {!disabled && <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-30 min-w-[200px] rounded-2xl overflow-hidden shadow-float"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {roles.map((r, i) => (
                <button key={r.id} onClick={() => { onChange(r.name); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-card-hover transition-colors text-left"
                  style={i < roles.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: r.color }}>{r.label}</p>
                    {r.description && <p className="text-[10px] text-subtle mt-0.5">{r.description}</p>}
                  </div>
                  {value === r.name && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: r.color }} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ roles, onCreated, onClose }: {
  roles: Role[]; onCreated: (u: AppUser) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const u = await res.json();
      toast.success(`User ${u.name ?? u.email} created`);
      onCreated(u); onClose();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create user");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)" }}>
            <UserPlus className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">Create User</h2>
            <p className="text-xs text-muted">Add a new team member</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-card-hover transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Password *</label>
            <div className="relative">
              <input required type={showPw ? "text" : "password"} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
              {roles.map((r) => <option key={r.id} value={r.name}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted hover:bg-elevated transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.email || !form.password}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: "var(--accent)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Create Role Modal ─────────────────────────────────────────────────────────
function CreateRoleModal({ onCreated, onClose }: {
  onCreated: (r: Role) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", label: "", color: COLOR_PRESETS[3], description: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, permissions: [] }),
    });
    if (res.ok) {
      const r = await res.json();
      toast.success(`Role "${r.label}" created`);
      onCreated(r); onClose();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create role");
    }
    setSaving(false);
  };

  const slug = form.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)" }}>
            <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">Create Role</h2>
            <p className="text-xs text-muted">Define a new access role</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-card-hover transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Display Name *</label>
            <input required autoFocus value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value, name: e.target.value })}
              placeholder="e.g. QA Engineer"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
            {slug && <p className="text-[10px] text-subtle mt-1">Internal ID: <code className="font-mono">{slug}</code></p>}
          </div>
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What can this role do?"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-2">Color</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                  style={{ background: c, outline: form.color === c ? `2px solid white` : "none", outlineOffset: "2px" }} />
              ))}
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                style={{ background: "var(--bg-elevated)" }} />
            </div>
          </div>

          {/* Preview badge */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-[10px] text-subtle">Preview:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${form.color}20`, color: form.color }}>
              {form.label || "New Role"}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted hover:bg-elevated transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.label.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {saving ? "Creating…" : "Create Role"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Permission toggle ─────────────────────────────────────────────────────────
function PermToggle({ id, label, description, checked, onChange, disabled }: {
  id: string; label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void; disabled: boolean;
}) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-card-hover"}`}>
      <div onClick={disabled ? undefined : () => onChange(!checked)}
        className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
        style={{ background: checked ? "var(--accent)" : "var(--bg-elevated)", border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}` }}>
        <motion.div animate={{ x: checked ? 16 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${checked ? "text-foreground" : "text-muted"}`}>{label}</p>
        <p className="text-[10px] text-subtle truncate">{description}</p>
      </div>
    </label>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [tab, setTab]     = useState<AdminTab>("users");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);

  // Permissions tab
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [pendingPerms, setPendingPerms]      = useState<string[]>([]);
  const [savingPerms, setSavingPerms]        = useState(false);

  // Users tab
  const [userSearch, setUserSearch] = useState("");

  // Rewards tab
  const [rewardConfigs, setRewardConfigs] = useState<{ id: string; role: string; action: string; points: number; isEnabled: boolean }[]>([]);
  const [rewardDirty, setRewardDirty]     = useState(false);
  const [savingRewards, setSavingRewards] = useState(false);
  const [coupons, setCoupons]             = useState<{ id: string; code: string; label: string; description: string | null; pointCost: number; quantity: number | null; usedCount: number; expiresAt: string | null; isActive: boolean; _count: { redemptions: number } }[]>([]);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", label: "", description: "", pointCost: "0", quantity: "", expiresAt: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [u, r, rc, cp] = await Promise.all([
      fetch("/api/admin/users").then((x) => x.json()),
      fetch("/api/admin/roles").then((x) => x.json()),
      fetch("/api/admin/rewards").then((x) => x.json()),
      fetch("/api/admin/coupons").then((x) => x.json()),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
    setRewardConfigs(Array.isArray(rc) ? rc : []);
    setCoupons(Array.isArray(cp) ? cp : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // When a role is selected in Permissions tab, load its current perms
  useEffect(() => {
    const r = roles.find((x) => x.id === selectedRoleId);
    if (r) setPendingPerms([...r.permissions]);
  }, [selectedRoleId, roles]);

  const updateUserRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated: AppUser = await res.json();
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      toast.success(`Role updated to ${roles.find((r) => r.name === role)?.label ?? role}`);
    } else toast.error(await getApiError(res, "Failed to update role"));
  };

  const deleteRole = async (roleId: string) => {
    const r = roles.find((x) => x.id === roleId);
    if (!confirm(`Delete role "${r?.label}"? Users with this role will be set to Member.`)) return;
    const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((x) => x.id !== roleId));
      toast.success("Role deleted");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to delete");
    }
  };

  const savePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingPerms(true);
    const res = await fetch(`/api/admin/roles/${selectedRoleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: pendingPerms }),
    });
    if (res.ok) {
      const updated: Role = await res.json();
      setRoles((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      toast.success("Permissions saved");
    } else toast.error(await getApiError(res, "Failed to save permissions"));
    setSavingPerms(false);
  };

  const togglePerm = (perm: string, checked: boolean) => {
    setPendingPerms((prev) => checked ? [...prev, perm] : prev.filter((p) => p !== perm));
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isDirty = selectedRole
    ? JSON.stringify([...pendingPerms].sort()) !== JSON.stringify([...selectedRole.permissions].sort())
    : false;

  const filteredUsers = users.filter((u) =>
    !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "users",       label: "Users",        icon: <Users className="w-3.5 h-3.5" /> },
    { key: "roles",       label: "Roles",        icon: <Shield className="w-3.5 h-3.5" /> },
    { key: "permissions", label: "Permissions",  icon: <Key className="w-3.5 h-3.5" /> },
    { key: "rewards",     label: "Rewards",      icon: <span className="text-xs">🏆</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #A78BFA, #60A5FA)", boxShadow: "0 0 20px rgba(167,139,250,0.35)" }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #F43F5E 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}>Admin Panel</h1>
            <p className="text-xs text-subtle">{users.length} users · {roles.length} roles</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === key ? "text-foreground" : "text-muted hover:text-foreground"}`}
              style={tab === key ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <motion.div key="users" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              </div>
              <button onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: "var(--accent)" }}>
                <UserPlus className="w-4 h-4" /> Create User
              </button>
            </div>

            {/* User table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 text-[10px] font-black text-subtle uppercase tracking-widest"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                <span>User</span>
                <span>Email</span>
                <span>Joined</span>
                <span>Role</span>
              </div>

              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 skeleton mx-4 my-2 rounded-xl" />
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No users found</div>
              ) : filteredUsers.map((u, i) => {
                const isMe = u.id === session?.user?.id;
                const userRole = roles.find((r) => r.name === u.role);
                return (
                  <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-card-hover transition-colors"
                    style={i < filteredUsers.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} image={u.image} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {u.name ?? "—"}
                          {isMe && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>You</span>}
                        </p>
                      </div>
                    </div>
                    {/* Email */}
                    <p className="text-xs text-muted truncate">{u.email}</p>
                    {/* Joined */}
                    <p className="text-xs text-subtle whitespace-nowrap">{format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                    {/* Role */}
                    <RoleDropdown value={u.role} roles={roles}
                      onChange={(r) => updateUserRole(u.id, r)}
                      disabled={isMe || u.role === "OWNER"} />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── ROLES TAB ── */}
        {tab === "roles" && (
          <motion.div key="roles" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{roles.filter((r) => !r.isSystem).length} custom · {roles.filter((r) => r.isSystem).length} system roles</p>
              <button onClick={() => setShowCreateRole(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                style={{ background: "var(--accent)" }}>
                <Plus className="w-4 h-4" /> Create Role
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((r, i) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-5"
                  style={{ background: "var(--bg-card)", border: `1px solid ${r.color}30` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${r.color}18` }}>
                        {r.isSystem ? <Lock className="w-4 h-4" style={{ color: r.color }} /> : <Shield className="w-4 h-4" style={{ color: r.color }} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{r.label}</p>
                        <code className="text-[10px] text-subtle font-mono">{r.name}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.isSystem ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>System</span>
                      ) : (
                        <button onClick={() => deleteRole(r.id)}
                          className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger transition-colors text-subtle">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.description && <p className="text-xs text-muted mb-3">{r.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-subtle">
                      {r.permissions.length} permission{r.permissions.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] font-semibold"
                      style={{ color: "var(--text-subtle)" }}>
                      {users.filter((u) => u.role === r.name).length} user{users.filter((u) => u.role === r.name).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Mini permission preview */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.permissions.slice(0, 4).map((p) => (
                      <span key={p} className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: `${r.color}12`, color: r.color }}>
                        {p}
                      </span>
                    ))}
                    {r.permissions.length > 4 && (
                      <span className="text-[9px] font-semibold text-subtle px-1.5 py-0.5">
                        +{r.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setSelectedRoleId(r.id); setTab("permissions"); }}
                    className="mt-3 w-full py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: `${r.color}12`, color: r.color }}>
                    Edit Permissions →
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PERMISSIONS TAB ── */}
        {tab === "permissions" && (
          <motion.div key="permissions" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
              {/* Role selector */}
              <div className="rounded-2xl overflow-hidden sticky top-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="px-4 py-3 text-[10px] font-black text-subtle uppercase tracking-widest"
                  style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                  Select Role
                </div>
                {roles.map((r) => (
                  <button key={r.id} onClick={() => setSelectedRoleId(r.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-hover"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: selectedRoleId === r.id ? `${r.color}10` : "transparent",
                    }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      <p className="text-[10px] text-subtle">{r.permissions.length} permissions</p>
                    </div>
                    {selectedRoleId === r.id && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: r.color }} />}
                  </button>
                ))}
              </div>

              {/* Permission toggles */}
              {selectedRole ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${selectedRole.color}18` }}>
                        <Key className="w-4 h-4" style={{ color: selectedRole.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{selectedRole.label} Permissions</h3>
                        <p className="text-[11px] text-muted">{pendingPerms.length} of {ALL_PERMISSIONS.length} enabled</p>
                      </div>
                      {selectedRole.isSystem && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                          <Lock className="w-2.5 h-2.5" /> System role
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedRole.isSystem && (
                        <>
                          <button onClick={() => setPendingPerms(ALL_PERMISSIONS.map((p) => p.id))}
                            className="text-xs font-semibold text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-elevated">
                            Grant all
                          </button>
                          <button onClick={() => setPendingPerms([])}
                            className="text-xs font-semibold text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-elevated">
                            Revoke all
                          </button>
                          <button onClick={savePermissions} disabled={savingPerms || !isDirty}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                            style={{ background: isDirty ? "var(--accent)" : "var(--bg-elevated)", color: isDirty ? "#fff" : "var(--text-subtle)" }}>
                            {savingPerms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {savingPerms ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Permission categories */}
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat);
                    const enabledCount = catPerms.filter((p) => pendingPerms.includes(p.id)).length;
                    return (
                      <div key={cat} className="rounded-2xl overflow-hidden"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between px-4 py-3"
                          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-muted" />
                            <span className="text-xs font-bold text-foreground">{cat}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-subtle">
                            {enabledCount}/{catPerms.length} enabled
                          </span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {catPerms.map((p) => (
                            <PermToggle
                              key={p.id}
                              id={p.id}
                              label={p.label}
                              description={p.description}
                              checked={pendingPerms.includes(p.id)}
                              onChange={(v) => togglePerm(p.id, v)}
                              disabled={selectedRole.isSystem}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem" }}>
                  <Key className="w-10 h-10 text-subtle mb-3" />
                  <p className="text-sm font-bold text-foreground">Select a role</p>
                  <p className="text-xs text-muted mt-1">Choose a role from the list to view and edit its permissions</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── REWARDS TAB ── */}
        {tab === "rewards" && (() => {
          const ACTIONS = [
            { key: "task_complete", label: "Task Completed",          icon: "✅" },
            { key: "task_early",    label: "Completed Before Deadline", icon: "⚡" },
            { key: "attendance",    label: "Attendance Marked",        icon: "📅" },
            { key: "streak",        label: "7-Day Streak Bonus",       icon: "🔥" },
          ];
          // Include all roles except OWNER in the rewards grid
          const REWARD_ROLES = roles
            .filter((r) => r.name !== "OWNER")
            .map((r) => r.name);
          const ROLE_PALETTE = ["#34D399", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA", "#F87171", "#34D3D3"];
          const ROLE_COLORS_MAP: Record<string, string> = {};
          REWARD_ROLES.forEach((name, i) => {
            ROLE_COLORS_MAP[name] = ROLE_PALETTE[i % ROLE_PALETTE.length];
          });

          const getConfig = (role: string, action: string) =>
            rewardConfigs.find((c) => c.role === role && c.action === action);

          const updateConfig = (role: string, action: string, field: "points" | "isEnabled", value: number | boolean) => {
            setRewardConfigs((prev) => {
              const exists = prev.some((c) => c.role === role && c.action === action);
              if (exists) {
                return prev.map((c) => c.role === role && c.action === action ? { ...c, [field]: value } : c);
              }
              // Add default entry for custom roles not yet seeded
              const newEntry = { id: `${role}_${action}`, role, action, points: 0, isEnabled: true, [field]: value };
              return [...prev, newEntry as typeof prev[0]];
            });
            setRewardDirty(true);
          };

          const saveRewards = async () => {
            setSavingRewards(true);
            await fetch("/api/admin/rewards", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(rewardConfigs),
            });
            setSavingRewards(false);
            setRewardDirty(false);
            toast.success("Reward rules saved");
          };

          const createCoupon = async () => {
            const res = await fetch("/api/admin/coupons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...couponForm,
                pointCost: Number(couponForm.pointCost),
                quantity: couponForm.quantity ? Number(couponForm.quantity) : null,
                expiresAt: couponForm.expiresAt || null,
              }),
            });
            if (res.ok) {
              const c = await res.json();
              setCoupons((prev) => [{ ...c, _count: { redemptions: 0 } }, ...prev]);
              setCouponForm({ code: "", label: "", description: "", pointCost: "0", quantity: "", expiresAt: "" });
              setShowCreateCoupon(false);
              toast.success("Coupon created");
            } else {
              const err = await res.json();
              toast.error(err.error ?? "Failed to create coupon");
            }
          };

          const deleteCoupon = async (id: string) => {
            await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
            setCoupons((prev) => prev.filter((c) => c.id !== id));
            toast.success("Coupon deleted");
          };

          const toggleCouponActive = async (id: string, isActive: boolean) => {
            await fetch(`/api/admin/coupons/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive }),
            });
            setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, isActive } : c));
          };

          return (
            <motion.div key="rewards" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-8">

              {/* ── Point Rules ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Point Rules</h3>
                    <p className="text-xs text-muted mt-0.5">Set how many points each role earns per action. Disable to stop awarding that action.</p>
                  </div>
                  <button onClick={saveRewards} disabled={!rewardDirty || savingRewards}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: rewardDirty ? "var(--accent)" : "var(--bg-elevated)", color: rewardDirty ? "#fff" : "var(--text-subtle)" }}>
                    <Save className="w-3.5 h-3.5" />
                    {savingRewards ? "Saving…" : rewardDirty ? "Save Rules" : "Saved"}
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {/* Header row */}
                  <div className="grid px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted"
                    style={{ gridTemplateColumns: `1fr repeat(${REWARD_ROLES.length}, 140px)`, borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <span>Action</span>
                    {REWARD_ROLES.map((r) => (
                      <span key={r} style={{ color: ROLE_COLORS_MAP[r] }}>{r}</span>
                    ))}
                  </div>

                  {ACTIONS.map((action, ai) => (
                    <div key={action.key}
                      className="grid items-center px-4 py-3"
                      style={{
                        gridTemplateColumns: `1fr repeat(${REWARD_ROLES.length}, 140px)`,
                        borderBottom: ai < ACTIONS.length - 1 ? "1px solid var(--border)" : "none",
                        background: "var(--bg-card)",
                      }}>
                      <div className="flex items-center gap-2">
                        <span>{action.icon}</span>
                        <span className="text-sm font-medium text-foreground">{action.label}</span>
                      </div>
                      {REWARD_ROLES.map((role) => {
                        const cfg = getConfig(role, action.key);
                        const enabled = cfg?.isEnabled ?? true;
                        const pts = cfg?.points ?? 0;
                        const rc = ROLE_COLORS_MAP[role];
                        return (
                          <div key={role} className="flex items-center gap-2">
                            {/* Toggle */}
                            <button onClick={() => updateConfig(role, action.key, "isEnabled", !enabled)}
                              className="w-8 h-4 rounded-full relative transition-colors shrink-0"
                              style={{ background: enabled ? rc : "var(--bg-elevated)", border: `1px solid ${enabled ? rc : "var(--border)"}` }}>
                              <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                                style={{ left: enabled ? "calc(100% - 14px)" : "1px" }} />
                            </button>
                            {/* Points input */}
                            <input type="number" min="0" max="999" value={pts} disabled={!enabled}
                              onChange={(e) => updateConfig(role, action.key, "points", parseInt(e.target.value) || 0)}
                              className="w-14 text-center text-sm font-bold rounded-lg px-1 py-1 transition-all"
                              style={{
                                background: enabled ? `${rc}12` : "var(--bg-elevated)",
                                color: enabled ? rc : "var(--text-muted)",
                                border: `1px solid ${enabled ? `${rc}30` : "var(--border)"}`,
                                outline: "none",
                              }} />
                            <span className="text-[10px] text-muted">pts</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Coupons ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Coupons</h3>
                    <p className="text-xs text-muted mt-0.5">Create redeemable rewards. Members spend their points balance to claim them.</p>
                  </div>
                  <button onClick={() => setShowCreateCoupon((p) => !p)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    <Plus className="w-3.5 h-3.5" /> New Coupon
                  </button>
                </div>

                {/* Create form */}
                <AnimatePresence>
                  {showCreateCoupon && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-2xl p-5 space-y-3"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Code *</label>
                          <input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                            placeholder="COFFEE25" className="mt-1 w-full px-3 py-2 rounded-xl text-sm font-mono font-bold"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Label *</label>
                          <input value={couponForm.label} onChange={(e) => setCouponForm((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Coffee Voucher ☕" className="mt-1 w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Point Cost (0 = free)</label>
                          <input type="number" min="0" value={couponForm.pointCost} onChange={(e) => setCouponForm((p) => ({ ...p, pointCost: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Quantity (blank = unlimited)</label>
                          <input type="number" min="1" value={couponForm.quantity} onChange={(e) => setCouponForm((p) => ({ ...p, quantity: e.target.value }))}
                            placeholder="e.g. 10" className="mt-1 w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Expiry Date</label>
                          <input type="date" value={couponForm.expiresAt} onChange={(e) => setCouponForm((p) => ({ ...p, expiresAt: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Description</label>
                          <input value={couponForm.description} onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))}
                            placeholder="Optional details..." className="mt-1 w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)", outline: "none" }} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowCreateCoupon(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted hover:text-foreground transition-colors">Cancel</button>
                        <button onClick={createCoupon} disabled={!couponForm.code || !couponForm.label}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                          style={{ background: "var(--accent)" }}>Create Coupon</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Coupon list */}
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {coupons.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm font-bold text-foreground">No coupons yet</p>
                      <p className="text-xs text-muted mt-1">Create your first coupon above</p>
                    </div>
                  )}
                  {coupons.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3"
                      style={{ borderBottom: i < coupons.length - 1 ? "1px solid var(--border)" : "none", background: "var(--bg-card)", opacity: c.isActive ? 1 : 0.5 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg" style={{ background: "rgba(157,107,255,0.15)", color: "#9D6BFF" }}>{c.code}</span>
                          <span className="text-sm font-bold text-foreground">{c.label}</span>
                          {!c.isActive && <span className="text-[10px] text-muted">(inactive)</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
                          <span>{c.pointCost === 0 ? "Free" : `${c.pointCost} pts`}</span>
                          <span>{c._count.redemptions}/{c.quantity ?? "∞"} redeemed</span>
                          {c.expiresAt && <span>Expires {format(new Date(c.expiresAt), "MMM d, yyyy")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleCouponActive(c.id, !c.isActive)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                          style={{ background: c.isActive ? "rgba(52,211,153,0.12)" : "var(--bg-elevated)", color: c.isActive ? "#34D399" : "var(--text-muted)" }}>
                          {c.isActive ? "Active" : "Inactive"}
                        </button>
                        <button onClick={() => { if (confirm(`Delete coupon "${c.label}"?`)) deleteCoupon(c.id); }}
                          className="p-2 rounded-xl text-muted hover:text-danger transition-colors"
                          style={{ background: "var(--bg-elevated)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}

      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateUser && (
          <CreateUserModal roles={roles}
            onCreated={(u) => setUsers((prev) => [...prev, u])}
            onClose={() => setShowCreateUser(false)} />
        )}
        {showCreateRole && (
          <CreateRoleModal
            onCreated={(r) => setRoles((prev) => [...prev, r])}
            onClose={() => setShowCreateRole(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
