"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Clock, AlertCircle, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";

interface PortalData {
  portal: { showTasks: boolean; showHealth: boolean; showTimeline: boolean };
  project: { id: string; name: string; description: string | null; color: string; status: string; deadline: string | null; clientName: string | null; healthScore: number | null };
  tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null; assignee?: { name: string } | null }[];
  stats: { total: number; done: number; inProgress: number; overdue: number };
}

const STATUS_COLOR: Record<string, string> = {
  DONE: "#00F090", IN_PROGRESS: "#06B6D4", REVIEW: "#FFC107", TODO: "#9D6BFF", BACKLOG: "#6B7280",
};
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#9D6BFF", LOW: "#6B7280",
};

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]         = useState<PortalData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [needsPw, setNeedsPw]   = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(true);

  async function load(pw?: string) {
    setLoading(true);
    const url = `/api/portal/${token}${pw ? `?password=${encodeURIComponent(pw)}` : ""}`;
    const res = await fetch(url);
    const json = await res.json();
    setLoading(false);

    if (res.status === 401 && json.passwordProtected) { setNeedsPw(true); return; }
    if (!res.ok) { setError(json.error ?? "Portal not found"); return; }
    setData(json);
  }

  useEffect(() => { load(); }, [token]);

  const pct = data ? Math.round((data.stats.done / Math.max(1, data.stats.total)) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0F1A]">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  if (needsPw) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0F1A]">
      <div className="w-96 rounded-2xl p-8 space-y-5 bg-[#13162A] border border-[#1E2140]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Password Protected</h2>
            <p className="text-xs text-gray-500">Enter the password to view this portal</p>
          </div>
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(password)}
          placeholder="Enter password…"
          className="w-full h-10 rounded-xl px-4 text-sm text-white bg-[#1A1D35] border border-[#1E2140] focus:outline-none focus:border-violet-500" />
        <button onClick={() => load(password)}
          className="w-full h-10 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors">
          Unlock
        </button>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0F1A]">
      <div className="text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto" />
        <p className="text-lg font-bold text-gray-400">{error ?? "Portal unavailable"}</p>
      </div>
    </div>
  );

  const { project, tasks, stats } = data;

  return (
    <div className="min-h-screen bg-[#0D0F1A] text-white">
      {/* Header */}
      <div className="border-b border-[#1E2140]" style={{ background: "#13162A" }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl" style={{ background: project.color + "25" }}>
              <div className="w-full h-full rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 rounded" style={{ background: project.color }} />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black">{project.name}</h1>
              {project.clientName && <p className="text-xs text-gray-500">Client: {project.clientName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: project.status === "ACTIVE" ? "rgba(0,240,144,0.1)" : "rgba(157,107,255,0.1)", color: project.status === "ACTIVE" ? "#00F090" : "#9D6BFF" }}>
              {project.status}
            </span>
            {project.deadline && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                Due {format(new Date(project.deadline), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks",  value: stats.total,      icon: Clock,         color: "#9D6BFF" },
            { label: "Completed",    value: stats.done,        icon: CheckCircle2,  color: "#00F090" },
            { label: "In Progress",  value: stats.inProgress,  icon: Clock,         color: "#06B6D4" },
            { label: "Overdue",      value: stats.overdue,     icon: AlertCircle,   color: "#FF4466" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-5 text-center space-y-2"
              style={{ background: "#13162A", border: "1px solid #1E2140" }}>
              <Icon className="w-5 h-5 mx-auto" style={{ color }} />
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-2xl p-6 space-y-3" style={{ background: "#13162A", border: "1px solid #1E2140" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Overall Progress</span>
            <span className="text-2xl font-black" style={{ color: "#00F090" }}>{pct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#1A1D35" }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#9D6BFF,#00F090)" }} />
          </div>
          {project.healthScore !== null && (
            <p className="text-xs text-gray-500">Health score: <span style={{ color: project.healthScore >= 70 ? "#00F090" : project.healthScore >= 40 ? "#FFC107" : "#FF4466" }}>{project.healthScore.toFixed(0)}/100</span></p>
          )}
        </div>

        {/* Task list */}
        {data.portal.showTasks && tasks.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#13162A", border: "1px solid #1E2140" }}>
            <div className="px-5 py-4 border-b border-[#1E2140]">
              <h2 className="text-sm font-black">Tasks</h2>
            </div>
            <div className="divide-y divide-[#1E2140]">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[t.status] }} />
                  <span className={`flex-1 text-sm truncate ${t.status === "DONE" ? "line-through text-gray-600" : "text-gray-200"}`}>{t.title}</span>
                  {t.assignee && <span className="text-xs text-gray-500 shrink-0">{t.assignee.name}</span>}
                  {t.dueDate && (
                    <span className="text-xs shrink-0"
                      style={{ color: new Date(t.dueDate) < new Date() && t.status !== "DONE" ? "#FF4466" : "#6B7280" }}>
                      {format(new Date(t.dueDate), "MMM d")}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: PRIORITY_COLOR[t.priority] + "18", color: PRIORITY_COLOR[t.priority] }}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 pb-4">
          Powered by <span className="font-bold text-gray-500">ZYNOTRIX</span>
        </p>
      </div>
    </div>
  );
}
