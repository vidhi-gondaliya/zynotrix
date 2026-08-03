"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, TaskStatus, TaskPriority, User } from "@/types";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/api-error";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskModal({ open, onClose, projectId, task, defaultStatus, onSave, onDelete }: TaskModalProps) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: "", description: "", status: defaultStatus ?? "BACKLOG" as TaskStatus,
    priority: "MEDIUM" as TaskPriority, assigneeId: "", dueDate: "", tags: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
      if (task) {
        setForm({
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId ?? "",
          dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
          tags: (Array.isArray(task.tags) ? task.tags : (typeof task.tags === "string" ? JSON.parse(task.tags) : [])).join(", "),
        });
      } else {
        setForm({ title: "", description: "", status: defaultStatus ?? "BACKLOG", priority: "MEDIUM", assigneeId: "", dueDate: "", tags: "" });
      }
    }
  }, [open, task, defaultStatus]);

  const doSave = async (addAnother = false) => {
    setSaving(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const body = { ...form, tags, assigneeId: form.assigneeId || null, dueDate: form.dueDate || null };

    const url    = isEdit ? `/api/tasks/${task!.id}` : `/api/projects/${projectId}/tasks`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      const saved = await res.json();
      onSave(saved);
      if (addAnother && !isEdit) {
        toast.success("Task created — add another");
        setForm({ title: "", description: "", status: form.status, priority: form.priority, assigneeId: form.assigneeId, dueDate: "", tags: "" });
      } else {
        onClose();
        toast.success(isEdit ? "Task updated" : "Task created");
      }
    } else {
      toast.error(await getApiError(res, "Failed to save task"));
    }
    setSaving(false);
  };

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); doSave(false); };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(task.id);
      onClose();
      toast.success("Task deleted");
    }
    setDeleting(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Task" : "New Task"} size="md">
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <Input label="Title" placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea label="Description" placeholder="Add details, context, or acceptance criteria..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
            options={[
              { value: "BACKLOG", label: "Backlog" },
              { value: "TODO", label: "To Do" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "REVIEW", label: "Review" },
              { value: "DONE", label: "Done" },
            ]}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Assignee */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Assignee</label>
            <select
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
            {form.assigneeId && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Avatar name={users.find((u) => u.id === form.assigneeId)?.name} size="xs" />
                <span className="text-xs text-muted">{users.find((u) => u.id === form.assigneeId)?.name}</span>
              </div>
            )}
          </div>
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>

        <Input label="Tags" placeholder="frontend, bug, design (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />

        <div className="flex items-center justify-between pt-2">
          {isEdit && onDelete && (
            <Button variant="danger" size="sm" type="button" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            {!isEdit && (
              <Button variant="secondary" type="button" loading={saving} onClick={() => doSave(true)}>
                Save & Add Another
              </Button>
            )}
            <Button type="submit" loading={saving}>{isEdit ? "Update" : "Create"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
