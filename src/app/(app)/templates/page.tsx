"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Loader2, Copy, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Template {
  id: string; name: string; description: string | null; category: string;
  color: string; emoji: string; isPublic: boolean; usageCount: number;
  config: string; createdById: string;
  createdBy: { id: string; name: string; image?: string };
}
interface Project { id: string; name: string; color: string; }

const CATEGORY_OPTIONS = ["general", "software", "marketing", "design", "operations", "hr", "finance", "sales"];
const CATEGORY_COLORS: Record<string, string> = {
  general: "#9D6BFF", software: "#06B6D4", marketing: "#F43F5E", design: "#EC4899",
  operations: "#FFC107", hr: "#00F090", finance: "#3B82F6", sales: "#F97316",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState({ name: "", description: "", category: "general", emoji: "📋", isPublic: false, fromProjectId: "" });
  const [userId, setUserId]       = useState<string>("");

  const load = useCallback(async () => {
    const [tRes, pRes, meRes] = await Promise.all([
      fetch(`/api/templates${category ? `?category=${category}` : ""}`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/users/me").then((r) => r.json()).catch(() => ({})),
    ]);
    setTemplates(tRes);
    setProjects(pRes.projects ?? pRes);
    setUserId(meRes.id ?? "");
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function applyTemplate(templateId: string, name: string) {
    setApplying(templateId);
    const res = await fetch(`/api/templates/${templateId}/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: name }),
    });
    setApplying(null);
    if (!res.ok) return toast.error("Failed to apply template");
    const data = await res.json();
    toast.success(`Project "${name}" created!`);
    router.push(`/projects/${data.project.id}/board`);
  }

  async function createTemplate() {
    if (!form.name) return toast.error("Name required");
    const res = await fetch("/api/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fromProjectId: form.fromProjectId || undefined }),
    });
    if (!res.ok) return toast.error("Failed to create");
    toast.success("Template created");
    setCreating(false);
    setForm({ name: "", description: "", category: "general", emoji: "📋", isPublic: false, fromProjectId: "" });
    load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    load();
  }

  const filtered = templates.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Project Templates</h1>
          <p className="text-sm text-muted mt-1">Start fast with pre-built task lists and workflows</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#9D6BFF,#EC4899)", boxShadow: "0 4px 12px rgba(157,107,255,0.3)" }}>
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…" className="pl-9 pr-4 h-9 rounded-xl text-sm font-medium text-foreground focus:outline-none w-56"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setCategory("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${!category ? "text-white" : "text-muted"}`}
            style={!category ? { background: "var(--accent)" } : { background: "var(--bg-elevated)" }}>
            All
          </button>
          {CATEGORY_OPTIONS.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${category === c ? "text-white" : "text-muted"}`}
              style={category === c ? { background: CATEGORY_COLORS[c] } : { background: "var(--bg-elevated)" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--accent)" }}>
          <h3 className="text-sm font-black text-foreground">New Template</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                placeholder="Template name" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Emoji</label>
              <input value={form.emoji} onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none capitalize"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Import from Project</label>
              <select value={form.fromProjectId} onChange={(e) => setForm((p) => ({ ...p, fromProjectId: e.target.value }))}
                className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <option value="">None (empty template)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
                  className="w-4 h-4 rounded accent-violet-500" />
                <span className="text-xs font-semibold text-muted">Make public (visible to all users)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createTemplate}
              className="h-9 px-5 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}>
              Create
            </button>
            <button onClick={() => setCreating(false)}
              className="h-9 px-5 rounded-xl text-sm font-bold text-muted"
              style={{ background: "var(--bg-elevated)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Sparkles className="w-10 h-10 text-muted" />
          <p className="text-sm font-semibold text-muted">No templates found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => {
            const tasks = JSON.parse(t.config)?.tasks ?? [];
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-5 flex flex-col gap-4 transition-all group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color + "80"; e.currentTarget.style.boxShadow = `0 4px 20px ${t.color}20`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: t.color + "18" }}>
                      {t.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{t.name}</p>
                      <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-full"
                        style={{ background: (CATEGORY_COLORS[t.category] ?? "#9D6BFF") + "18", color: CATEGORY_COLORS[t.category] ?? "#9D6BFF" }}>
                        {t.category}
                      </span>
                    </div>
                  </div>
                  {t.createdById === userId && (
                    <button onClick={() => deleteTemplate(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {t.description && <p className="text-xs text-muted leading-relaxed">{t.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{tasks.length} tasks</span>
                    <span>{t.usageCount} uses</span>
                    {t.isPublic && <span className="text-green-400 font-bold">Public</span>}
                  </div>
                  <button
                    onClick={() => {
                      const name = prompt(`Project name for "${t.name}"`, t.name);
                      if (name) applyTemplate(t.id, name);
                    }}
                    disabled={applying === t.id}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: t.color }}>
                    {applying === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                    Use
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
