"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, Plus, Search, Trash2, X, Save,
  Eye, Edit3, Clock, FolderOpen, ChevronRight,
  Share2, Link2, Users, Lock, Check, UserPlus,
  ChevronDown, Tag,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Author  { id: string; name: string | null; image: string | null; email?: string; }
interface Project { id: string; name: string; color: string; }
interface DocShare { id: string; userId: string; role: string; user: Author; }
interface Document {
  id: string; title: string; content: string;
  projectId: string | null; taskId: string | null;
  authorId: string; isPersonal: boolean;
  createdAt: string; updatedAt: string;
  author?: Author; project?: Project | null;
  shares?: DocShare[];
}
interface TaskItem { id: string; title: string; status: string; }

type EditorMode = "edit" | "preview";
type DocSection = "personal" | "shared" | "linked";

// ── Share Panel ────────────────────────────────────────────────────────────────
function SharePanel({ doc, users, onClose }: {
  doc: Document;
  users: Author[];
  onClose: () => void;
}) {
  const [shares, setShares] = useState<DocShare[]>(doc.shares ?? []);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const addShare = async (userId: string) => {
    setAdding(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "EDITOR" }),
      });
      if (res.ok) { const s = await res.json(); setShares((p) => [...p.filter((x) => x.userId !== userId), s]); }
      else { const e = await res.json(); toast.error(e.error ?? "Failed"); }
    } catch { toast.error("Failed to share"); }
    finally { setAdding(false); }
  };

  const removeShare = async (userId: string) => {
    setShares((p) => p.filter((s) => s.userId !== userId));
    await fetch(`/api/documents/${doc.id}/share`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  };

  const sharedUserIds = new Set(shares.map((s) => s.userId));
  const filteredUsers = users.filter((u) =>
    u.id !== doc.authorId && !sharedUserIds.has(u.id) &&
    (!search || (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
      className="absolute right-0 top-12 w-72 z-50 rounded-2xl p-4 space-y-3 shadow-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-accent" /> Share Document
        </p>
        <button onClick={onClose} className="text-subtle hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Current shares */}
      {shares.length > 0 && (
        <div className="space-y-1.5">
          {shares.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
              style={{ background: "var(--bg-elevated)" }}>
              <Avatar name={s.user.name} image={s.user.image} size="xs" />
              <span className="flex-1 text-xs font-semibold text-foreground truncate">{s.user.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{s.role}</span>
              <button onClick={() => removeShare(s.userId)}
                className="text-subtle hover:text-danger transition-colors ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add members */}
      <div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredUsers.map((u) => (
            <button key={u.id} onClick={() => addShare(u.id)} disabled={adding}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-elevated transition-colors text-left disabled:opacity-50">
              <Avatar name={u.name} image={u.image} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                <p className="text-[10px] text-subtle truncate">{u.email}</p>
              </div>
              <UserPlus className="w-3 h-3 text-subtle" />
            </button>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-[11px] text-subtle text-center py-2">
              {search ? "No matching members" : "All members already added"}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Link to Task/Project picker ────────────────────────────────────────────────
function LinkPicker({ doc, projects, onLink, onClose }: {
  doc: Document;
  projects: Project[];
  onLink: (data: { projectId?: string; taskId?: string }) => void;
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selProject, setSelProject] = useState(doc.projectId ?? "");

  useEffect(() => {
    if (!selProject) { setTasks([]); return; }
    setLoadingTasks(true);
    fetch(`/api/projects/${selProject}/tasks`)
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : []))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [selProject]);

  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
      className="absolute right-0 top-12 w-68 z-50 rounded-2xl p-4 space-y-3 shadow-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", minWidth: "260px" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-foreground flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-accent" /> Link To
        </p>
        <button onClick={onClose} className="text-subtle hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Project picker */}
      <div>
        <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1">Project</p>
        <select value={selProject}
          onChange={(e) => { setSelProject(e.target.value); onLink({ projectId: e.target.value || undefined }); }}
          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
          <option value="">No project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Task picker */}
      {selProject && (
        <div>
          <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1">Task</p>
          {loadingTasks ? (
            <div className="text-xs text-subtle py-2">Loading tasks…</div>
          ) : (
            <select value={doc.taskId ?? ""}
              onChange={(e) => onLink({ taskId: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
              <option value="">No task</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          )}
        </div>
      )}

      <button onClick={onClose}
        className="w-full py-1.5 rounded-xl text-xs font-bold transition-all"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Done
      </button>
    </motion.div>
  );
}

// ── Document Editor ────────────────────────────────────────────────────────────
function DocumentEditor({ doc, users, projects, onSaved, onDeleted, onClose }: {
  doc: Document;
  users: Author[];
  projects: Project[];
  onSaved: (d: Document) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle]         = useState(doc.title);
  const [content, setContent]     = useState(doc.content);
  const [mode, setMode]           = useState<EditorMode>("edit");
  const [saving, setSaving]       = useState(false);
  const [dirty, setDirty]         = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showLink, setShowLink]   = useState(false);
  const [localDoc, setLocalDoc]   = useState<Document>(doc);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocalDoc(doc); setTitle(doc.title); setContent(doc.content); }, [doc.id]);

  const scheduleAutoSave = useCallback((t: string, c: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, content: c }),
      });
      if (res.ok) { const updated: Document = await res.json(); onSaved(updated); setLocalDoc(updated); setDirty(false); }
    }, 1500);
  }, [doc.id, onSaved]);

  const handleLink = async (data: { projectId?: string; taskId?: string }) => {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { const u: Document = await res.json(); onSaved(u); setLocalDoc(u); }
  };

  const saveNow = async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) { const u: Document = await res.json(); onSaved(u); setLocalDoc(u); setDirty(false); toast.success("Saved"); }
    setSaving(false);
  };

  const deleteDoc = async () => {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    onDeleted(doc.id); toast.success("Deleted");
  };

  const isOwner = doc.authorId === localDoc.authorId;

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated transition-colors">
          <X className="w-3.5 h-3.5 text-muted" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[10px] text-subtle">
          {localDoc.project && (
            <>
              <div className="w-2 h-2 rounded-sm" style={{ background: localDoc.project.color }} />
              <span>{localDoc.project.name}</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </>
          )}
          {localDoc.isPersonal && (
            <><Lock className="w-2.5 h-2.5" /><span>Personal Note</span><ChevronRight className="w-2.5 h-2.5" /></>
          )}
          {localDoc.shares && localDoc.shares.length > 0 && (
            <div className="flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5 text-accent" />
              <span style={{ color: "var(--accent)" }}>{localDoc.shares.length} shared</span>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Link button */}
        <div className="relative">
          <button onClick={() => { setShowLink((o) => !o); setShowShare(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: localDoc.projectId || localDoc.taskId ? "var(--accent-muted)" : "var(--bg-elevated)",
              color: localDoc.projectId || localDoc.taskId ? "var(--accent)" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}>
            <Link2 className="w-3 h-3" />
            {localDoc.taskId ? "Task linked" : localDoc.projectId ? "Project linked" : "Link"}
          </button>
          <AnimatePresence>
            {showLink && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLink(false)} />
                <LinkPicker doc={localDoc} projects={projects}
                  onLink={(data) => { handleLink(data); }}
                  onClose={() => setShowLink(false)} />
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Share button — only for author */}
        {isOwner && (
          <div className="relative">
            <button onClick={() => { setShowShare((o) => !o); setShowLink(false); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: (localDoc.shares?.length ?? 0) > 0 ? "var(--accent-muted)" : "var(--bg-elevated)",
                color: (localDoc.shares?.length ?? 0) > 0 ? "var(--accent)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}>
              <Share2 className="w-3 h-3" />
              {(localDoc.shares?.length ?? 0) > 0 ? `${localDoc.shares!.length} shared` : "Share"}
            </button>
            <AnimatePresence>
              {showShare && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
                  <SharePanel doc={localDoc} users={users} onClose={() => setShowShare(false)} />
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {(["edit", "preview"] as EditorMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${mode === m ? "text-foreground" : "text-muted hover:text-foreground"}`}
              style={mode === m ? { background: "var(--bg-card)" } : {}}>
              {m === "edit" ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {m === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>

        {/* Save */}
        <button onClick={saveNow} disabled={saving || !dirty}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: dirty ? "var(--accent)" : "var(--bg-elevated)", color: dirty ? "#fff" : "var(--text-subtle)" }}>
          <Save className="w-3 h-3" />
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>

        <button onClick={deleteDoc}
          className="p-1.5 rounded-lg hover:text-danger transition-colors text-muted">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6 max-w-3xl mx-auto w-full">
        <input value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); scheduleAutoSave(e.target.value, content); }}
          placeholder="Document title…"
          className="w-full text-3xl font-black text-foreground bg-transparent outline-none placeholder:text-subtle mb-5 leading-tight" />

        {mode === "edit" ? (
          <textarea value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); scheduleAutoSave(title, e.target.value); }}
            placeholder={`Start writing… (Markdown supported)\n\n# Heading\n**Bold**, _italic_, - lists\n\`\`\`code\`\`\``}
            className="w-full min-h-[500px] resize-none bg-transparent text-sm text-muted outline-none leading-relaxed font-mono placeholder:text-subtle"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }} />
        ) : (
          <div className="min-h-[500px]">
            {content ? <MarkdownRenderer content={content} /> : <p className="text-sm text-subtle italic">Nothing to preview yet.</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-5 py-2.5 shrink-0 text-[10px] text-subtle"
        style={{ borderTop: "1px solid var(--border)" }}>
        {doc.author && <Avatar name={doc.author.name} image={doc.author.image} size="xs" />}
        <span>Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
        {localDoc.taskId && (
          <span className="flex items-center gap-1" style={{ color: "var(--accent)" }}>
            <Tag className="w-2.5 h-2.5" /> Linked to task
          </span>
        )}
        <span className="ml-auto">{content.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </motion.div>
  );
}

// ── Sidebar doc item ───────────────────────────────────────────────────────────
function DocItem({ doc, active, onClick }: { doc: Document; active: boolean; onClick: () => void }) {
  const isShared = (doc.shares?.length ?? 0) > 0;
  const hasLink  = doc.projectId || doc.taskId;
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl transition-colors hover:bg-elevated flex items-start gap-3"
      style={active ? { background: "var(--accent-muted)" } : {}}>
      <div className="mt-0.5 shrink-0">
        {doc.isPersonal
          ? <Lock className="w-3.5 h-3.5" style={{ color: active ? "var(--accent)" : "var(--text-subtle)" }} />
          : <FileText className="w-3.5 h-3.5" style={{ color: active ? "var(--accent)" : "var(--text-subtle)" }} />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold truncate ${active ? "text-accent" : "text-foreground"}`}>{doc.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {doc.project && (
            <span className="flex items-center gap-1 text-[10px] text-subtle">
              <div className="w-1.5 h-1.5 rounded-sm" style={{ background: doc.project.color }} />
              {doc.project.name}
            </span>
          )}
          {isShared && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--accent)" }}><Users className="w-2.5 h-2.5" /></span>}
          {hasLink && <Link2 className="w-2.5 h-2.5 text-subtle" />}
          <span className="text-[10px] text-subtle flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      {active && <ChevronRight className="w-3 h-3 text-accent shrink-0 mt-0.5" />}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs]       = useState<Document[]>([]);
  const [users, setUsers]     = useState<Author[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPersonal, setNewPersonal] = useState(false);
  const [section, setSection] = useState<DocSection>("personal");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => { setDocs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch((err) => console.error("[documents] load users", err));
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch((err) => console.error("[documents] load projects", err));
  }, [load]);

  const createDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), content: "", projectId: newProject || null, isPersonal: newPersonal }),
    });
    if (res.ok) {
      const d: Document = await res.json();
      setDocs((p) => [d, ...p]);
      setActiveId(d.id); setCreating(false);
      setNewTitle(""); setNewProject(""); setNewPersonal(false);
    }
  };

  // Section filter
  const myId = users.find(() => true)?.id; // doesn't matter — we filter by authorId from API
  const filtered = docs.filter((d) => {
    if (search) return d.title.toLowerCase().includes(search.toLowerCase()) || d.content.toLowerCase().includes(search.toLowerCase());
    return true;
  }).filter((d) => {
    if (section === "personal") return d.isPersonal;
    if (section === "shared")   return (d.shares?.length ?? 0) > 0 || !d.isPersonal;
    if (section === "linked")   return d.projectId || d.taskId;
    return true;
  });

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  const SECTIONS: { key: DocSection; label: string; icon: React.ReactNode }[] = [
    { key: "personal", label: "My Notes",   icon: <Lock className="w-3 h-3" /> },
    { key: "shared",   label: "Workspace",  icon: <Users className="w-3 h-3" /> },
    { key: "linked",   label: "Linked",     icon: <Link2 className="w-3 h-3" /> },
  ];

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* ── Sidebar ── */}
      <div className="w-72 shrink-0 flex flex-col border-r overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold text-foreground">Documents</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{docs.length}</span>
          </div>
          <button onClick={() => setCreating(true)}
            className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-card transition-colors"
            style={{ color: "var(--accent)" }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0.5 px-2 pt-2 pb-1 shrink-0">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={{
                background: section === s.key ? "var(--accent-muted)" : "transparent",
                color: section === s.key ? "var(--accent)" : "var(--text-subtle)",
              }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-3 py-1.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs…"
              className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-medium outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>
        </div>

        {/* New doc form */}
        <AnimatePresence>
          {creating && (
            <motion.form onSubmit={createDoc}
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="px-3 py-2 space-y-2 shrink-0 overflow-hidden"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Document title…"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              <select value={newProject} onChange={(e) => setNewProject(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-medium outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label className="flex items-center gap-2 px-1 cursor-pointer">
                <div onClick={() => setNewPersonal((v) => !v)}
                  className="w-8 h-4 rounded-full relative transition-all"
                  style={{ background: newPersonal ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                    style={{ left: newPersonal ? "calc(100% - 14px)" : "2px" }} />
                </div>
                <span className="text-[10px] font-semibold text-muted">Personal note (private)</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={!newTitle.trim()}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}>Create</button>
                <button type="button" onClick={() => { setCreating(false); setNewTitle(""); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-card transition-colors text-muted">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 skeleton rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center px-4">
              <FileText className="w-8 h-8 text-subtle mb-2 opacity-40" />
              <p className="text-xs text-muted">{search ? "No matching docs" : "No documents here"}</p>
              {!search && <p className="text-[11px] text-subtle mt-0.5">Click + to create one</p>}
            </div>
          ) : (
            filtered.map((doc) => (
              <DocItem key={doc.id} doc={doc} active={activeId === doc.id}
                onClick={() => setActiveId(doc.id)} />
            ))
          )}
        </div>
      </div>

      {/* ── Editor panel ── */}
      <div className="flex-1 overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <AnimatePresence mode="wait">
          {activeDoc ? (
            <DocumentEditor
              key={activeDoc.id}
              doc={activeDoc}
              users={users}
              projects={projects}
              onSaved={(u) => setDocs((p) => p.map((d) => d.id === u.id ? u : d))}
              onDeleted={(id) => { setDocs((p) => p.filter((d) => d.id !== id)); setActiveId(null); }}
              onClose={() => setActiveId(null)}
            />
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: "var(--accent-muted)" }}>
                <FileText className="w-8 h-8" style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">Your Documents</h3>
              <p className="text-sm text-muted max-w-xs">
                Rich notes, specs, and wikis with Markdown. Personal notes stay private; share workspace docs with team members.
              </p>
              <button onClick={() => setCreating(true)}
                className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff" }}>
                <Plus className="w-4 h-4" /> New Document
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
