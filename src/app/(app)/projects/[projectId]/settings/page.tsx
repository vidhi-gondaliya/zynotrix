"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, ExternalLink, Plus, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Project } from "@/types";
import toast from "react-hot-toast";

interface CustomField { id: string; name: string; type: string; options: string | null; isRequired: boolean; }
interface ClientPortal { id: string; token: string; isActive: boolean; showTasks: boolean; showHealth: boolean; showTimeline: boolean; password: string | null; }

const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN", "URL"];

const PROJECT_COLORS = ["#7C3AED","#4F46E5","#06B6D4","#10B981","#F59E0B","#EF4444","#EC4899","#8B5CF6"];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject]     = useState<Project | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [customFields, setCustomFields]   = useState<CustomField[]>([]);
  const [portal, setPortal]               = useState<ClientPortal | null>(null);
  const [newField, setNewField]           = useState({ name: "", type: "TEXT", options: "" });
  const [addingField, setAddingField]     = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", color: "#7C3AED", clientName: "", clientEmail: "",
    budget: "", budgetSpent: "", deadline: "", status: "ACTIVE",
  });

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p: Project & { budgetSpent?: number }) => {
        setProject(p);
        setForm({
          name: p.name,
          description: p.description ?? "",
          color: p.color ?? "#7C3AED",
          clientName: p.clientName ?? "",
          clientEmail: p.clientEmail ?? "",
          budget: p.budget?.toString() ?? "",
          budgetSpent: (p as any).budgetSpent?.toString() ?? "",
          deadline: p.deadline ? new Date(p.deadline).toISOString().split("T")[0] : "",
          status: p.status ?? "ACTIVE",
        });
      });
    fetch(`/api/projects/${projectId}/custom-fields`).then((r) => r.json()).then(setCustomFields).catch(() => {});
    fetch(`/api/projects/${projectId}/client-portal`).then((r) => r.json()).then((d) => { if (d?.id) setPortal(d); }).catch(() => {});
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        budget: form.budget ? Number(form.budget) : null,
        budgetSpent: form.budgetSpent ? Number(form.budgetSpent) : null,
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Project updated");
    else toast.error("Failed to update");
  };

  const addCustomField = async () => {
    if (!newField.name) return;
    const res = await fetch(`/api/projects/${projectId}/custom-fields`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newField.name, type: newField.type,
        options: newField.type === "SELECT" && newField.options ? newField.options.split(",").map((s) => s.trim()) : undefined,
      }),
    });
    if (res.ok) {
      const field = await res.json();
      setCustomFields((p) => [...p, field]);
      setNewField({ name: "", type: "TEXT", options: "" });
      setAddingField(false);
      toast.success("Field added");
    }
  };

  const deleteCustomField = async (fieldId: string) => {
    await fetch(`/api/projects/${projectId}/custom-fields/${fieldId}`, { method: "DELETE" });
    setCustomFields((p) => p.filter((f) => f.id !== fieldId));
    toast.success("Field removed");
  };

  const createPortal = async () => {
    setPortalLoading(true);
    const res = await fetch(`/api/projects/${projectId}/client-portal`, { method: "POST" });
    const data = await res.json();
    setPortal(data);
    setPortalLoading(false);
    toast.success("Client portal enabled");
  };

  const updatePortal = async (updates: Partial<ClientPortal>) => {
    const res = await fetch(`/api/projects/${projectId}/client-portal`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) setPortal((p) => p ? { ...p, ...updates } : p);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    toast.success("Project deleted");
    router.push("/projects");
  };

  if (!project) return <div className="p-6 text-muted text-sm">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Project Details</h2>
          <Input label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent/50 focus:border-accent outline-none">
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Client & Budget</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Acme Corp" />
            <Input label="Client Email" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} placeholder="client@acme.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget (USD)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="10000" />
            <Input label="Budget Spent (USD)" type="number" value={form.budgetSpent} onChange={(e) => setForm({ ...form, budgetSpent: e.target.value })} placeholder="0" />
          </div>
          {form.budget && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">Budget utilization</span>
                <span className="text-xs font-bold" style={{ color: Number(form.budgetSpent) / Number(form.budget) > 0.9 ? "#FF4466" : "#00F090" }}>
                  {Math.min(100, Math.round((Number(form.budgetSpent ?? 0) / Number(form.budget)) * 100))}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((Number(form.budgetSpent ?? 0) / Number(form.budget)) * 100))}%`,
                    background: Number(form.budgetSpent) / Number(form.budget) > 0.9 ? "#FF4466" : "#00F090",
                  }} />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
      </form>

      {/* Custom Fields */}
      <div className="glass-card p-6 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Custom Fields</h2>
          <button onClick={() => setAddingField(true)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
            <Plus className="w-3 h-3" /> Add Field
          </button>
        </div>
        <p className="text-xs text-muted">Custom fields appear in task detail panels for this project.</p>

        {addingField && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Field Name</label>
                <input value={newField.name} onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Story Points" className="w-full h-8 rounded-lg px-2 text-xs font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Type</label>
                <select value={newField.type} onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value }))}
                  className="w-full h-8 rounded-lg px-2 text-xs font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {newField.type === "SELECT" && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Options (comma-separated)</label>
                  <input value={newField.options} onChange={(e) => setNewField((p) => ({ ...p, options: e.target.value }))}
                    placeholder="Option A, Option B, Option C" className="w-full h-8 rounded-lg px-2 text-xs font-medium text-foreground focus:outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={addCustomField} className="h-8 px-4 rounded-lg text-xs font-bold text-white" style={{ background: "var(--accent)" }}>Add</button>
              <button onClick={() => setAddingField(false)} className="h-8 px-4 rounded-lg text-xs font-bold text-muted" style={{ background: "var(--bg-card)" }}>Cancel</button>
            </div>
          </div>
        )}

        {customFields.length === 0 && !addingField ? (
          <p className="text-xs text-muted text-center py-4">No custom fields yet</p>
        ) : (
          <div className="space-y-2">
            {customFields.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <span className="text-sm font-semibold text-foreground flex-1">{f.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>{f.type}</span>
                <button onClick={() => deleteCustomField(f.id)} className="p-1 rounded text-muted hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Portal */}
      <div className="glass-card p-6 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h2 className="text-sm font-semibold text-foreground">Client Portal</h2>
          </div>
          {!portal && (
            <button onClick={createPortal} disabled={portalLoading}
              className="h-8 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}>
              {portalLoading ? "Creating…" : "Enable Portal"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">Share a read-only view of this project with clients — no login required.</p>

        {portal && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)" }}>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-2">Portal URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-foreground truncate"
                  style={{ background: "var(--bg-card)", padding: "6px 10px", borderRadius: "8px" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/portal/${portal.token}` : `/portal/${portal.token}`}
                </code>
                <button onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/portal/${portal.token}`);
                  toast.success("URL copied");
                }} className="h-8 px-3 rounded-lg text-xs font-bold text-muted hover:text-foreground transition-colors"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>Copy</button>
                <a href={`/portal/${portal.token}`} target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground transition-colors"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "isActive", label: "Portal Active" },
                { key: "showTasks", label: "Show Tasks" },
                { key: "showHealth", label: "Show Health Score" },
                { key: "showTimeline", label: "Show Timeline" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <input type="checkbox" checked={(portal as any)[key] ?? false}
                    onChange={(e) => updatePortal({ [key]: e.target.checked } as Partial<ClientPortal>)}
                    className="w-4 h-4 rounded accent-violet-500" />
                  <span className="text-xs font-semibold text-muted">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-6 mt-6 border border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-xs text-muted mb-4">Deleting this project will permanently remove all tasks, comments, and associated data. This action cannot be undone.</p>
        {confirmDelete && (
          <p className="text-xs text-red-400 mb-3 font-medium">Are you sure? Click again to confirm permanent deletion.</p>
        )}
        <Button variant="danger" loading={deleting} icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
          {confirmDelete ? "Confirm Delete" : "Delete Project"}
        </Button>
      </div>
    </div>
  );
}
