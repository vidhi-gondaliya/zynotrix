"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, User, Flag, Plus,
  CheckCircle2, Circle, Trash2, Edit3, Clock,
  ChevronDown, AlignLeft, Hash, MessageSquare, Send, Activity,
  LayoutGrid, CheckSquare, Zap, Paperclip, FileText, Image, File,
  Timer, Link2, GitBranch, Play, Square, StopCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, User as UserType, TaskStatus, TaskPriority } from "@/types";
import { format, isPast, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Subtask { id: string; title: string; status: string; assignee?: { id: string; name: string | null; image: string | null } | null; }
interface Comment { id: string; content: string; createdAt: string; author: { id: string; name: string | null; image: string | null }; }
interface TaskActivityEntry { id: string; action: string; meta: Record<string, string | null>; createdAt: string; user: { id: string; name: string | null; image: string | null }; }

const ACTIVITY_LABELS: Record<string, (meta: Record<string, string | null>) => string> = {
  created:             () => "created this task",
  status_changed:      (m) => `moved to ${m.to ?? ""}`,
  priority_changed:    (m) => `changed priority to ${m.to ?? ""}`,
  assigned:            () => "assigned task",
  unassigned:          () => "removed assignee",
  due_date_changed:    (m) => m.to ? `set due date to ${m.to}` : "removed due date",
  title_changed:       () => "renamed the task",
  description_changed: () => "updated description",
  commented:           () => "added a comment",
  comment_deleted:     () => "deleted a comment",
  subtask_added:       (m) => `added subtask "${m.title ?? ""}"`,
};

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "BACKLOG",     label: "Backlog",     color: "#6B7280" },
  { value: "TODO",        label: "To Do",       color: "#60A5FA" },
  { value: "IN_PROGRESS", label: "In Progress", color: "#9D6BFF" },
  { value: "REVIEW",      label: "Review",      color: "#FFC107" },
  { value: "DONE",        label: "Done",        color: "#00F090" },
];
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; bg: string }[] = [
  { value: "URGENT", label: "Urgent", color: "#FF4466", bg: "rgba(255,68,102,0.12)" },
  { value: "HIGH",   label: "High",   color: "#FFC107", bg: "rgba(255,193,7,0.12)"  },
  { value: "MEDIUM", label: "Medium", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  { value: "LOW",    label: "Low",    color: "#6B7280", bg: "rgba(107,114,128,0.12)"},
];

type Tab = "overview" | "subtasks" | "comments" | "activity" | "attachments" | "time" | "deps";

// ── Attachment type ───────────────────────────────────────────────────────────
interface Attachment { id: string; name: string; url: string; size: number; type: string; createdAt: string; }

// ── Inline dropdowns ──────────────────────────────────────────────────────────
function InlineSelect<T extends string>({ value, options, onChange, icon }: {
  value: T;
  options: { value: T; label: string; color: string; bg?: string }[];
  onChange: (v: T) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const opt = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        style={{ background: opt.bg ?? `${opt.color}15`, color: opt.color, border: `1px solid ${opt.color}25` }}>
        {icon}
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: opt.color }} />
        {opt.label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.12 }}
              className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden min-w-[130px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-float)" }}>
              {options.map((o) => (
                <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-elevated transition-colors text-left"
                  style={{ color: o.value === value ? o.color : "var(--text-muted)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: o.color }} />
                  {o.label}
                  {o.value === value && <span className="ml-auto text-[10px]">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  projectId: string;
}

export function TaskDetailPanel({ task, open, onClose, onUpdate, onDelete }: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [form, setForm] = useState({ title: "", description: "", status: "TODO" as TaskStatus, priority: "MEDIUM" as TaskPriority, dueDate: "", assigneeId: "", tags: [] as string[], estimatedHours: "" });
  const [users, setUsers] = useState<UserType[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [activities, setActivities] = useState<TaskActivityEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Multi-assignee state
  const [multiAssignees, setMultiAssignees] = useState<{ userId: string; user: { id: string; name: string | null; image: string | null; email: string } }[]>([]);
  const [showAddAssignee, setShowAddAssignee] = useState(false);

  // Subtask comments state
  const [subtaskCommentMap, setSubtaskCommentMap] = useState<Record<string, { content: string; comments: { id: string; content: string; createdAt: string; author: { name: string | null; image: string | null } }[] }>>({});

  // Time tracking state
  interface TimeLog { id: string; startedAt: string; endedAt: string | null; duration: number | null; description: string | null; user: { id: string; name: string | null; image: string | null }; }
  const [timeLogs, setTimeLogs]       = useState<TimeLog[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [logDesc, setLogDesc]         = useState("");
  const [logMins, setLogMins]         = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dependencies state
  interface DepTask { id: string; title: string; status: string; priority: string; dependencyId: string; }
  const [blockedBy, setBlockedBy]   = useState<DepTask[]>([]);
  const [blocking,  setBlocking]    = useState<DepTask[]>([]);
  const [depSearch, setDepSearch]   = useState("");
  const [depResults, setDepResults] = useState<{ id: string; title: string; status: string }[]>([]);

  // External links state (GitHub PRs, etc.)
  interface TaskLinkItem { id: string; type: string; externalId: string; url: string; title: string | null; status: string | null; }
  const [taskLinks, setTaskLinks]   = useState<TaskLinkItem[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Reset tab on task change
  useEffect(() => { setActiveTab("overview"); }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
      assigneeId: task.assigneeId ?? "",
      tags: task.tags ?? [],
      estimatedHours: task.estimatedHours ? String(task.estimatedHours) : "",
    });
    fetch(`/api/tasks/${task.id}/subtasks`).then((r) => r.json())
      .then((d: Subtask[]) => setSubtasks(Array.isArray(d) ? d : [])).catch(() => setSubtasks([]));
    fetch(`/api/tasks/${task.id}/comments`).then((r) => r.json())
      .then((d: Comment[]) => setComments(Array.isArray(d) ? d : [])).catch(() => setComments([]));
    fetch(`/api/tasks/${task.id}/activity`).then((r) => r.json())
      .then((d: TaskActivityEntry[]) => setActivities(Array.isArray(d) ? d : [])).catch(() => setActivities([]));
    fetch(`/api/tasks/${task.id}/assignees`).then((r) => r.json())
      .then((d: any[]) => setMultiAssignees(Array.isArray(d) ? d : [])).catch(() => setMultiAssignees([]));
    fetch(`/api/tasks/${task.id}/time`).then((r) => r.json())
      .then((d: any) => { setTimeLogs(d.logs ?? []); setTotalMinutes(d.totalMinutes ?? 0); }).catch(() => { setTimeLogs([]); });
    fetch(`/api/tasks/${task.id}/dependencies`).then((r) => r.json())
      .then((d: any) => { setBlockedBy(d.blockedBy ?? []); setBlocking(d.blocking ?? []); }).catch(() => { setBlockedBy([]); setBlocking([]); });
    fetch(`/api/tasks/${task.id}/links`).then((r) => r.json())
      .then((d: any) => setTaskLinks(Array.isArray(d) ? d : [])).catch(() => setTaskLinks([]));
  }, [task]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch((err) => console.error("[task-panel] failed to load users", err));
  }, []);

  const save = async (updates: Partial<typeof form>) => {
    if (!task) return;
    const merged = { ...form, ...updates };
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...merged, dueDate: merged.dueDate || null, assigneeId: merged.assigneeId || null }),
    });
    if (res.ok) { const u = await res.json(); setForm(merged); onUpdate(u); }
    else toast.error("Failed to save");
    setSaving(false);
  };

  const addSubtask = async () => {
    if (!newSubtask.trim() || !task) return;
    const title = newSubtask.trim(); setNewSubtask("");
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (res.ok) { const sub: Subtask = await res.json(); setSubtasks((p) => [...p, sub]); }
    else toast.error("Failed to add subtask");
  };

  const toggleSubtask = async (id: string) => {
    if (!task) return;
    const sub = subtasks.find((s) => s.id === id); if (!sub) return;
    const ns = sub.status === "DONE" ? "TODO" : "DONE";
    setSubtasks((p) => p.map((s) => s.id === id ? { ...s, status: ns } : s));
    try { await fetch(`/api/tasks/${task.id}/subtasks`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtaskId: id, status: ns }) }); }
    catch { setSubtasks((p) => p.map((s) => s.id === id ? { ...s, status: sub.status } : s)); }
  };

  const deleteSubtask = async (id: string) => {
    setSubtasks((p) => p.filter((s) => s.id !== id));
    if (!task) return;
    await fetch(`/api/tasks/${task.id}/subtasks`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtaskId: id }) });
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;
    const content = newComment.trim(); setNewComment(""); setCommentLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      if (res.ok) { const c: Comment = await res.json(); setComments((p) => [...p, c]); }
      else { toast.error("Failed to add comment"); setNewComment(content); }
    } catch { toast.error("Failed to add comment"); setNewComment(content); }
    finally { setCommentLoading(false); }
  };

  const deleteComment = async (commentId: string) => {
    if (!task) return;
    setComments((p) => p.filter((c) => c.id !== commentId));
    const res = await fetch(`/api/tasks/${task.id}/comments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId }) });
    if (!res.ok) {
      toast.error("Failed to delete");
      fetch(`/api/tasks/${task.id}/comments`).then((r) => r.json()).then((d) => setComments(Array.isArray(d) ? d : []));
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) { onDelete(task.id); onClose(); toast.success("Task deleted"); }
  };

  const doneCount  = subtasks.filter((s) => s.status === "DONE").length;
  const progress   = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
  const assignee   = users.find((u) => u.id === form.assigneeId);
  const isOverdue  = form.dueDate && isPast(new Date(`${form.dueDate}T12:00:00`)) && form.status !== "DONE";
  const priConfig  = PRIORITY_OPTIONS.find((p) => p.value === form.priority) ?? PRIORITY_OPTIONS[2];
  const statConfig = STATUS_OPTIONS.find((s) => s.value === form.status) ?? STATUS_OPTIONS[0];

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "overview",     label: "Overview",     icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: "subtasks",     label: "Subtasks",     icon: <CheckSquare className="w-3.5 h-3.5" />, count: subtasks.length },
    { key: "comments",     label: "Comments",     icon: <MessageSquare className="w-3.5 h-3.5" />, count: comments.length },
    { key: "time",         label: "Time",         icon: <Timer className="w-3.5 h-3.5" />, count: timeLogs.length || undefined },
    { key: "deps",         label: "Depends",      icon: <GitBranch className="w-3.5 h-3.5" />, count: (blockedBy.length + blocking.length) || undefined },
    { key: "attachments",  label: "Files",        icon: <Paperclip className="w-3.5 h-3.5" />, count: attachments.length || undefined },
    { key: "activity",     label: "Activity",     icon: <Activity className="w-3.5 h-3.5" />, count: activities.length },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", task.id);
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (res.ok) {
        const att = await res.json();
        setAttachments((prev) => [att, ...prev]);
        toast.success("File attached");
      } else { toast.error("Upload failed"); }
    } catch { toast.error("Upload failed"); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const deleteAttachment = async (id: string) => {
    try {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const fileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4" style={{ color: "#60A5FA" }} />;
    if (type.includes("pdf"))      return <FileText className="w-4 h-4" style={{ color: "#FF4466" }} />;
    return <File className="w-4 h-4" style={{ color: "var(--text-muted)" }} />;
  };

  return (
    <AnimatePresence>
      {open && task && (
        <>
          {/* Backdrop */}
          <motion.div className="fixed inset-0 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(5,5,15,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="fixed right-0 top-0 h-full z-50 flex flex-col"
            style={{
              width: "min(600px, 96vw)",
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--border-strong)",
              boxShadow: "-24px 0 80px rgba(0,0,0,0.75)",
            }}>

            {/* Priority-colored top accent bar */}
            <div className="h-1 w-full shrink-0"
              style={{ background: `linear-gradient(90deg, ${priConfig.color}, ${statConfig.color})` }} />

            {/* Header */}
            <div className="px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              {/* Title row */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <input ref={titleRef} value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      onBlur={() => { setEditingTitle(false); save({ title: form.title }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { setEditingTitle(false); save({ title: form.title }); } if (e.key === "Escape") setEditingTitle(false); }}
                      className="w-full text-base font-bold rounded-xl px-3 py-2 outline-none"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-foreground)", border: "1.5px solid var(--accent)" }}
                      autoFocus />
                  ) : (
                    <button onClick={() => setEditingTitle(true)}
                      className="text-base font-bold text-left text-foreground group flex items-center gap-2 w-full">
                      <span className="flex-1 leading-snug text-left">{form.title}</span>
                      <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handleDelete}
                    className="p-2 rounded-xl text-subtle hover:text-danger transition-all"
                    style={{ background: "var(--bg-elevated)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onClose}
                    className="p-2 rounded-xl text-subtle hover:text-foreground transition-all"
                    style={{ background: "var(--bg-elevated)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick meta pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <InlineSelect
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(v) => save({ status: v })} />
                <InlineSelect
                  value={form.priority}
                  options={PRIORITY_OPTIONS}
                  icon={form.priority === "URGENT" ? <Zap className="w-3 h-3" /> : <Flag className="w-3 h-3" />}
                  onChange={(v) => save({ priority: v })} />

                {/* Due date */}
                <label className="relative cursor-pointer">
                  <input type="date" value={form.dueDate}
                    onChange={(e) => save({ dueDate: e.target.value })}
                    className="sr-only" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                    style={{
                      background: isOverdue ? "rgba(255,68,102,0.12)" : "var(--bg-elevated)",
                      color: isOverdue ? "#FF4466" : form.dueDate ? "var(--text-foreground)" : "var(--text-subtle)",
                      border: `1px solid ${isOverdue ? "rgba(255,68,102,0.3)" : "var(--border)"}`,
                    }}>
                    <Calendar className="w-3 h-3" />
                    {form.dueDate ? format(new Date(form.dueDate), "MMM d") : "Due date"}
                  </div>
                </label>

                {/* Multi-Assignees */}
                <div className="relative flex items-center gap-1 flex-wrap">
                  {multiAssignees.map((a) => (
                    <div key={a.userId} className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold group"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <Avatar name={a.user.name} image={a.user.image} size="xs" />
                      <span className="text-foreground">{a.user.name?.split(" ")[0] ?? "?"}</span>
                      <button className="opacity-0 group-hover:opacity-100 ml-0.5 text-subtle hover:text-danger transition-all"
                        onClick={async () => {
                          await fetch(`/api/tasks/${task?.id}/assignees`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.userId }) });
                          setMultiAssignees((prev) => prev.filter((x) => x.userId !== a.userId));
                        }}>×</button>
                    </div>
                  ))}
                  <div className="relative">
                    <button onClick={() => setShowAddAssignee((o) => !o)}
                      className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all hover:bg-elevated"
                      style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border)", color: "var(--text-subtle)" }}>
                      <Plus className="w-3 h-3" /> {multiAssignees.length === 0 ? "Assign" : "Add"}
                    </button>
                    <AnimatePresence>
                      {showAddAssignee && (
                        <>
                          <div className="fixed inset-0 z-50" onClick={() => setShowAddAssignee(false)} />
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="absolute top-full left-0 mt-1 z-50 rounded-2xl p-2 min-w-[180px] max-h-[220px] overflow-y-auto"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-float)" }}>
                            {users.filter((u) => !multiAssignees.find((a) => a.userId === u.id)).map((u) => (
                              <button key={u.id}
                                onClick={async () => {
                                  const res = await fetch(`/api/tasks/${task?.id}/assignees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) });
                                  if (res.ok) { const entry = await res.json(); setMultiAssignees((prev) => [...prev, entry]); }
                                  setShowAddAssignee(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-xs hover:bg-elevated transition-colors text-muted">
                                <Avatar name={u.name} image={u.image} size="xs" />
                                <span className="truncate">{u.name ?? u.email}</span>
                              </button>
                            ))}
                            {users.length === multiAssignees.length && <p className="text-[10px] text-subtle text-center py-2">All members assigned</p>}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 px-4 pt-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              {TABS.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all relative"
                  style={{
                    color: activeTab === tab.key ? "var(--accent)" : "var(--text-subtle)",
                    background: activeTab === tab.key ? "var(--accent-muted)" : "transparent",
                  }}>
                  {tab.icon}
                  {tab.label}
                  {(tab.count ?? 0) > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: activeTab === tab.key ? "var(--accent)" : "var(--bg-elevated)", color: activeTab === tab.key ? "#fff" : "var(--text-subtle)" }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ── Overview ── */}
                {activeTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-5">

                    {/* Description */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlignLeft className="w-3.5 h-3.5 text-subtle" />
                        <span className="text-[11px] font-bold text-subtle uppercase tracking-wider">Description</span>
                      </div>
                      <textarea value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        onBlur={() => save({ description: form.description })}
                        placeholder="Add a description, notes, or acceptance criteria…"
                        rows={5}
                        className="w-full rounded-xl px-3 py-3 text-sm text-foreground placeholder:text-subtle outline-none resize-none leading-relaxed transition-all"
                        style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-glow)"; }}
                        onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                    </div>

                    {/* Two-column meta grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Estimated Hours */}
                      <div className="rounded-xl p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                        <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Est. Hours
                        </p>
                        <input type="number" min="0" step="0.5" value={form.estimatedHours}
                          onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                          onBlur={() => save({ estimatedHours: form.estimatedHours })}
                          placeholder="e.g. 4"
                          className="w-full text-sm font-semibold text-foreground bg-transparent outline-none"
                        />
                      </div>
                      {/* Created */}
                      <div className="rounded-xl p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                        <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1">Created</p>
                        <p className="text-sm font-semibold text-foreground">
                          {task.createdAt ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true }) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-3.5 h-3.5 text-subtle" />
                        <span className="text-[11px] font-bold text-subtle uppercase tracking-wider">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {form.tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(0,207,255,0.08)", color: "#00CFFF", border: "1px solid rgba(0,207,255,0.15)" }}>
                            #{tag}
                            <button onClick={() => save({ tags: form.tags.filter((t) => t !== tag) })}
                              className="opacity-60 hover:opacity-100 ml-0.5">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <input placeholder="+ Add tag"
                          className="text-xs font-semibold bg-transparent text-subtle placeholder:text-subtle outline-none px-1 py-0.5"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value.trim().replace(/^#/, "");
                              if (val && !form.tags.includes(val)) save({ tags: [...form.tags, val] });
                              (e.target as HTMLInputElement).value = "";
                            }
                          }} />
                      </div>
                    </div>

                    {/* External links (GitHub PRs, etc.) */}
                    {(taskLinks.length > 0 || newLinkUrl !== undefined) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Link2 className="w-3.5 h-3.5 text-subtle" />
                            <p className="text-[11px] font-bold text-subtle uppercase tracking-wider">External Links</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {taskLinks.map((link) => (
                            <div key={link.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl group"
                              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: link.type === "GITHUB_PR" ? "rgba(36,41,47,0.5)" : "var(--bg-card)", color: "#58a6ff" }}>
                                {link.type === "GITHUB_PR" ? "PR" : link.type}
                              </span>
                              <a href={link.url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 text-xs font-semibold text-foreground hover:underline truncate">{link.title ?? link.url}</a>
                              {link.status && (
                                <span className="text-[10px] font-bold shrink-0"
                                  style={{ color: link.status === "merged" ? "#00F090" : link.status === "open" ? "#9D6BFF" : "#6B7280" }}>
                                  {link.status}
                                </span>
                              )}
                              <button onClick={async () => {
                                if (!task) return;
                                await fetch(`/api/tasks/${task.id}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId: link.id }) });
                                setTaskLinks((p) => p.filter((l) => l.id !== link.id));
                              }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-red-400 transition-all shrink-0">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
                              placeholder="Paste GitHub PR URL or any link…"
                              className="flex-1 h-7 rounded-lg px-2 text-xs text-foreground focus:outline-none"
                              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                              onKeyDown={async (e) => {
                                if (e.key !== "Enter" || !newLinkUrl.trim() || !task) return;
                                const url = newLinkUrl.trim();
                                const isGH = url.includes("github.com") && url.includes("/pull/");
                                const externalId = isGH ? url.split("/").pop() : url;
                                const res = await fetch(`/api/tasks/${task.id}/links`, {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: isGH ? "GITHUB_PR" : "LINK", externalId, url, title: url }),
                                });
                                if (res.ok) { const l = await res.json(); setTaskLinks((p) => [...p, l]); setNewLinkUrl(""); }
                              }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status pipeline visual */}
                    <div>
                      <p className="text-[11px] font-bold text-subtle uppercase tracking-wider mb-2">Progress</p>
                      <div className="flex items-center gap-1">
                        {STATUS_OPTIONS.map((s, i) => {
                          const statIdx  = STATUS_OPTIONS.findIndex((x) => x.value === form.status);
                          const isPast_  = i < statIdx;
                          const isCurrent = i === statIdx;
                          return (
                            <button key={s.value} onClick={() => save({ status: s.value })}
                              className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all"
                              style={{
                                background: isCurrent ? `${s.color}20` : isPast_ ? `${s.color}0A` : "var(--bg-elevated)",
                                color: isCurrent ? s.color : isPast_ ? s.color + "80" : "var(--text-subtle)",
                                border: `1px solid ${isCurrent ? s.color + "40" : "transparent"}`,
                              }}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Subtasks ── */}
                {activeTab === "subtasks" && (
                  <motion.div key="subtasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {subtasks.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                          <span>{doneCount} of {subtasks.length} done</span>
                          <span className="font-bold" style={{ color: progress === 100 ? "#00F090" : "var(--accent)" }}>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                          <motion.div className="h-full rounded-full"
                            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
                            style={{ background: progress === 100 ? "#00F090" : "var(--accent)" }} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {subtasks.map((sub) => {
                        const sc = subtaskCommentMap[sub.id] ?? { content: "", comments: [] };
                        const expanded = sub.id in subtaskCommentMap;
                        const toggleExpand = async () => {
                          if (expanded) {
                            setSubtaskCommentMap((m) => { const n = { ...m }; delete n[sub.id]; return n; });
                          } else {
                            const data = await fetch(`/api/tasks/${sub.id}/subtask-comments`).then((r) => r.json()).catch(() => []);
                            setSubtaskCommentMap((m) => ({ ...m, [sub.id]: { content: "", comments: Array.isArray(data) ? data : [] } }));
                          }
                        };
                        const addSubtaskComment = async () => {
                          if (!sc.content.trim()) return;
                          const res = await fetch(`/api/tasks/${sub.id}/subtask-comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: sc.content }) });
                          if (res.ok) {
                            const c = await res.json();
                            setSubtaskCommentMap((m) => ({ ...m, [sub.id]: { content: "", comments: [...(m[sub.id]?.comments ?? []), c] } }));
                          }
                        };
                        return (
                          <motion.div key={sub.id} layout className="rounded-xl overflow-hidden"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2.5 py-2 px-3 group">
                              <button onClick={() => toggleSubtask(sub.id)} className="shrink-0">
                                {sub.status === "DONE"
                                  ? <CheckCircle2 className="w-4 h-4" style={{ color: "#00F090" }} />
                                  : <Circle className="w-4 h-4 text-subtle group-hover:text-muted transition-colors" />
                                }
                              </button>
                              <span className={`flex-1 text-xs font-semibold ${sub.status === "DONE" ? "line-through text-subtle" : "text-foreground"}`}>
                                {sub.title}
                              </span>
                              <button onClick={toggleExpand}
                                className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition-all"
                                style={{ color: expanded ? "var(--accent)" : "var(--text-subtle)", background: expanded ? "var(--accent-muted)" : "transparent" }}>
                                <MessageSquare className="w-3 h-3" />
                                {sc.comments.length > 0 && <span>{sc.comments.length}</span>}
                              </button>
                              <button onClick={() => deleteSubtask(sub.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-subtle hover:text-danger transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <AnimatePresence>
                              {expanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  className="px-3 pb-2 space-y-2 overflow-hidden"
                                  style={{ borderTop: "1px solid var(--border)" }}>
                                  {sc.comments.map((c: any) => (
                                    <div key={c.id} className="flex gap-2 pt-2">
                                      <Avatar name={c.author.name} image={c.author.image} size="xs" />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-bold text-foreground">{c.author.name ?? "?"} </span>
                                        <span className="text-[10px] text-muted">{c.content}</span>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input value={sc.content}
                                      onChange={(e) => setSubtaskCommentMap((m) => ({ ...m, [sub.id]: { ...sc, content: e.target.value } }))}
                                      onKeyDown={(e) => e.key === "Enter" && addSubtaskComment()}
                                      placeholder="Add a comment… (Enter)"
                                      className="flex-1 text-xs bg-transparent outline-none text-muted placeholder:text-subtle px-2 py-1 rounded-lg"
                                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                                    {sc.content.trim() && (
                                      <button onClick={addSubtaskComment} className="p-1.5 rounded-lg text-white" style={{ background: "var(--accent)" }}>
                                        <Send className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--bg-elevated)", border: "1.5px dashed var(--border)" }}>
                      <Plus className="w-3.5 h-3.5 text-subtle shrink-0" />
                      <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                        placeholder="Add a subtask… (Enter to save)"
                        className="flex-1 text-sm bg-transparent text-muted placeholder:text-subtle outline-none" />
                      {newSubtask.trim() && (
                        <button onClick={addSubtask} className="text-[10px] font-bold px-2 py-1 rounded-lg text-white"
                          style={{ background: "var(--accent)" }}>Add</button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── Comments ── */}
                {activeTab === "comments" && (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 flex flex-col h-full">
                    <div className="flex-1 space-y-4 mb-4">
                      {comments.length === 0 && (
                        <div className="text-center py-12 text-subtle">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No comments yet</p>
                          <p className="text-xs mt-1">Be the first to share an update</p>
                        </div>
                      )}
                      {comments.map((c) => (
                        <motion.div key={c.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 group">
                          <Avatar name={c.author.name} image={c.author.image} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{c.author.name ?? "Unknown"}</span>
                              <span className="text-[10px] text-subtle">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span>
                            </div>
                            <div className="rounded-2xl px-3 py-2.5 text-sm text-muted leading-relaxed break-words"
                              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                              {c.content}
                            </div>
                          </div>
                          <button onClick={() => deleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-subtle hover:text-danger transition-all self-start mt-5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 shrink-0"
                      style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}>
                      <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                        placeholder="Write a comment…"
                        className="flex-1 text-sm bg-transparent text-foreground placeholder:text-subtle outline-none" />
                      <button onClick={addComment} disabled={!newComment.trim() || commentLoading}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                        style={{ background: "var(--accent)" }}>
                        <Send className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Activity ── */}
                {activeTab === "activity" && (
                  <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {activities.length === 0 ? (
                      <div className="text-center py-12 text-subtle">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No activity yet</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4">
                        <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
                        {[...activities].map((a) => (
                          <div key={a.id} className="relative flex items-start gap-3">
                            <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full border-2 shrink-0"
                              style={{ background: "var(--bg-card)", borderColor: "var(--accent)" }} />
                            <Avatar name={a.user.name} image={a.user.image} size="xs" />
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-xs">
                                <span className="font-bold text-foreground">{a.user.name ?? "Someone"}</span>
                                {" "}<span className="text-muted">{(ACTIVITY_LABELS[a.action] ?? (() => a.action))(a.meta)}</span>
                              </p>
                              <p className="text-[10px] text-subtle mt-0.5">
                                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "attachments" && (
                  <motion.div key="attachments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-3">
                    <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: "var(--bg-elevated)", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                      {uploadingFile ? <><Zap className="w-4 h-4 animate-pulse" /> Uploading…</> : <><Paperclip className="w-4 h-4" /> Attach a file</>}
                    </button>

                    {attachments.length === 0 ? (
                      <div className="text-center py-8 text-subtle">
                        <Paperclip className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No files attached</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl group"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: "var(--bg-card)" }}>
                              {fileIcon(att.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <a href={att.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-semibold text-foreground hover:underline truncate block">{att.name}</a>
                              <p className="text-[10px] text-subtle">{(att.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button onClick={() => deleteAttachment(att.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-danger/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5 text-danger" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Time Tracking ── */}
                {activeTab === "time" && (
                  <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-elevated)" }}>
                        <p className="text-xl font-black text-foreground">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
                        <p className="text-[10px] text-muted mt-0.5">Total logged</p>
                      </div>
                      {form.estimatedHours && (
                        <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-elevated)" }}>
                          <p className="text-xl font-black" style={{ color: totalMinutes > Number(form.estimatedHours) * 60 ? "#FF4466" : "#00F090" }}>
                            {Math.round((totalMinutes / (Number(form.estimatedHours) * 60)) * 100)}%
                          </p>
                          <p className="text-[10px] text-muted mt-0.5">of {form.estimatedHours}h estimate</p>
                        </div>
                      )}
                    </div>

                    {/* Log manual time */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] font-bold text-subtle uppercase tracking-widest">Log Time</p>
                      <div className="flex gap-2">
                        <input type="number" min="1" value={logMins} onChange={(e) => setLogMins(e.target.value)}
                          placeholder="Minutes" className="w-24 h-8 rounded-lg px-2 text-xs font-medium text-foreground focus:outline-none"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                        <input value={logDesc} onChange={(e) => setLogDesc(e.target.value)}
                          placeholder="What did you work on?" className="flex-1 h-8 rounded-lg px-2 text-xs font-medium text-foreground focus:outline-none"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                        <button onClick={async () => {
                          if (!task || !logMins) return;
                          const res = await fetch(`/api/tasks/${task.id}/time`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "log", durationMinutes: Number(logMins), description: logDesc }),
                          });
                          if (res.ok) {
                            const log = await res.json();
                            setTimeLogs((p) => [log, ...p]);
                            setTotalMinutes((p) => p + Number(logMins));
                            setLogMins(""); setLogDesc("");
                          }
                        }} disabled={!logMins}
                          className="h-8 px-3 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: "var(--accent)" }}>
                          Log
                        </button>
                      </div>
                    </div>

                    {/* Log list */}
                    {timeLogs.length === 0 ? (
                      <div className="text-center py-8">
                        <Timer className="w-7 h-7 mx-auto text-muted mb-2 opacity-40" />
                        <p className="text-xs text-muted">No time logged yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timeLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                            <Timer className="w-3.5 h-3.5 text-muted shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground">{log.duration ? `${log.duration}m` : "Running…"}</p>
                              {log.description && <p className="text-[10px] text-muted truncate">{log.description}</p>}
                            </div>
                            <span className="text-[10px] text-muted shrink-0">{log.user.name}</span>
                            <button onClick={async () => {
                              if (!task) return;
                              await fetch(`/api/tasks/${task.id}/time`, {
                                method: "DELETE", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ logId: log.id }),
                              });
                              setTimeLogs((p) => p.filter((l) => l.id !== log.id));
                              setTotalMinutes((p) => p - (log.duration ?? 0));
                            }} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted hover:text-red-400 transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Dependencies ── */}
                {activeTab === "deps" && (
                  <motion.div key="deps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                    {/* Add dep search */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-subtle uppercase tracking-widest">Add dependency (this task is blocked by…)</p>
                      <div className="relative">
                        <input value={depSearch} onChange={async (e) => {
                          setDepSearch(e.target.value);
                          if (e.target.value.length < 2) { setDepResults([]); return; }
                          const res = await fetch(`/api/projects/${task?.projectId}/tasks?q=${encodeURIComponent(e.target.value)}`).then((r) => r.json());
                          setDepResults((res.tasks ?? res).slice(0, 6));
                        }} placeholder="Search tasks…"
                          className="w-full h-8 rounded-xl px-3 text-xs font-medium text-foreground focus:outline-none"
                          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
                        {depResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 overflow-hidden"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>
                            {depResults.map((t) => (
                              <button key={t.id} onClick={async () => {
                                if (!task) return;
                                const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ dependsOnId: t.id }),
                                });
                                if (res.ok) {
                                  const dep = await res.json();
                                  setBlockedBy((p) => [...p, { ...dep.dependsOn, dependencyId: dep.id }]);
                                }
                                setDepSearch(""); setDepResults([]);
                              }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-card-hover transition-colors">
                                <span className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: t.status === "DONE" ? "#00F090" : "#9D6BFF" }} />
                                <span className="truncate text-foreground">{t.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocked by */}
                    {blockedBy.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Blocked by</span>
                        </div>
                        {blockedBy.map((dep) => (
                          <div key={dep.dependencyId} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                            style={{ background: "rgba(255,68,102,0.06)", border: "1px solid rgba(255,68,102,0.15)" }}>
                            <span className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: dep.status === "DONE" ? "#00F090" : "#FF4466" }} />
                            <span className={`flex-1 text-xs text-foreground truncate ${dep.status === "DONE" ? "line-through opacity-50" : ""}`}>{dep.title}</span>
                            {dep.status === "DONE" && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                            <button onClick={async () => {
                              if (!task) return;
                              await fetch(`/api/tasks/${task.id}/dependencies`, {
                                method: "DELETE", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ dependencyId: dep.dependencyId }),
                              });
                              setBlockedBy((p) => p.filter((d) => d.dependencyId !== dep.dependencyId));
                            }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-red-400 transition-all shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Blocking others */}
                    {blocking.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Blocking</span>
                        </div>
                        {blocking.map((dep) => (
                          <div key={dep.dependencyId} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.15)" }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FFC107" }} />
                            <span className="flex-1 text-xs text-foreground truncate">{dep.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {blockedBy.length === 0 && blocking.length === 0 && (
                      <div className="text-center py-10">
                        <GitBranch className="w-7 h-7 mx-auto text-muted mb-2 opacity-40" />
                        <p className="text-xs text-muted">No dependencies set</p>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 flex items-center gap-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <Clock className="w-3 h-3 text-subtle" />
              <span className="text-[10px] text-subtle">
                Updated {task.updatedAt ? formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true }) : "recently"}
              </span>
              {saving && <span className="ml-auto text-[10px] text-accent animate-pulse">Saving…</span>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
