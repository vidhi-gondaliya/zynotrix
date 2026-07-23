"use client";
import { useEffect, useState } from "react";
import {
  Heart, Sparkles, AlertTriangle, CheckCircle, TrendingUp,
  ShieldAlert, Users, Layers, Clock, RefreshCw, Calendar, Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { Project, HealthAnalysis } from "@/types";
import type { RiskAlert } from "@/app/api/alerts/route";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ   = 2 * Math.PI * radius;
  const color  = score > 70 ? "#10B981" : score > 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{score}</span>
        <span className="text-[9px] text-muted">/ 100</span>
      </div>
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
  critical: { color: "#FF4466", bg: "rgba(255,68,102,0.08)", border: "rgba(255,68,102,0.25)", icon: <ShieldAlert className="w-4 h-4" /> },
  warning:  { color: "#FFC107", bg: "rgba(255,193,7,0.08)",  border: "rgba(255,193,7,0.25)",  icon: <AlertTriangle className="w-4 h-4" /> },
  info:     { color: "#60A5FA", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", icon: <CheckCircle className="w-4 h-4" /> },
} as const;

const TYPE_ICON: Record<string, React.ReactNode> = {
  overdue_spike:    <Clock    className="w-3.5 h-3.5" />,
  low_completion:   <TrendingUp className="w-3.5 h-3.5" />,
  stalled_project:  <Layers   className="w-3.5 h-3.5" />,
  member_overload:  <Users    className="w-3.5 h-3.5" />,
  health_drop:      <Heart    className="w-3.5 h-3.5" />,
  deadline_risk:    <Clock    className="w-3.5 h-3.5" />,
  no_activity:      <Layers   className="w-3.5 h-3.5" />,
};

function AlertCard({ alert, i }: { alert: RiskAlert; i: number }) {
  const cfg = SEVERITY_CFG[alert.severity];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className="rounded-2xl p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${cfg.color}18`, color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-black" style={{ color: cfg.color }}>
              {alert.severity.toUpperCase()}
            </span>
            {/* Project or user badge */}
            {alert.projectName && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                <div className="w-1.5 h-1.5 rounded-sm" style={{ background: alert.projectColor }} />
                {alert.projectName}
              </span>
            )}
            {alert.userName && !alert.projectName && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                <Users className="w-2.5 h-2.5" />
                {alert.userName}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-semibold text-subtle">
              {TYPE_ICON[alert.type]}
              {alert.type.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground mb-0.5">{alert.title}</p>
          <p className="text-xs text-muted">{alert.detail}</p>
          {alert.action && (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
              <p className="text-[11px] font-semibold" style={{ color: cfg.color }}>{alert.action}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = "health" | "alerts";

export default function AIHealthPage() {
  const [tab, setTab]             = useState<Tab>("alerts");
  const [projects, setProjects]   = useState<Project[]>([]);
  const [analyses, setAnalyses]   = useState<Record<string, HealthAnalysis>>({});
  const [alerts, setAlerts]       = useState<RiskAlert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [predicting, setPredicting] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, { predictedDate: string | null; confidence: string; onTrack: boolean; daysEarlyOrLate: number; risks: string[]; recommendation: string; velocityNeeded: number }>>({});

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((data) => {
      setProjects(data);
      const cached: Record<string, HealthAnalysis> = {};
      data.forEach((p: Project) => {
        if (p.healthData) { try { cached[p.id] = JSON.parse(p.healthData); } catch {} }
      });
      setAnalyses(cached);
      setLoading(false);
    });
    loadAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlerts = () => {
    setAlertsLoading(true);
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => { setAlerts(Array.isArray(data) ? data : []); setAlertsLoading(false); })
      .catch((err) => { console.error("[health] load alerts", err); setAlertsLoading(false); });
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 300));
    loadAlerts();
    setRefreshing(false);
  };

  const analyze = async (projectId: string) => {
    setAnalyzing(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/health`);
      if (res.ok) {
        const data = await res.json();
        setAnalyses((prev) => ({ ...prev, [projectId]: data }));
        toast.success("Health analysis complete!");
        loadAlerts(); // re-check alerts after health update
      } else { toast.error("Analysis failed"); }
    } catch { toast.error("Analysis failed"); }
    setAnalyzing(null);
  };

  const predictDeadline = async (projectId: string) => {
    setPredicting(projectId);
    try {
      const res = await fetch("/api/ai/deadline-predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setPredictions((prev) => ({ ...prev, [projectId]: data }));
    } catch { toast.error("Prediction failed"); }
    setPredicting(null);
  };

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning  = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FB923C, #EF4444)", boxShadow: "0 0 20px rgba(251,146,60,0.35)" }}>
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Project Health</h1>
            <p className="text-xs text-subtle">AI-powered risk detection + manual health scoring</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <button onClick={() => setTab("alerts")}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${tab === "alerts" ? "text-foreground" : "text-muted hover:text-foreground"}`}
            style={tab === "alerts" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk Alerts
            {critical.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                style={{ background: "#FF4466" }}>{critical.length}</span>
            )}
          </button>
          <button onClick={() => setTab("health")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${tab === "health" ? "text-foreground" : "text-muted hover:text-foreground"}`}
            style={tab === "health" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
            <Heart className="w-3.5 h-3.5" />
            AI Health Score
          </button>
        </div>
      </div>

      {/* ── ALERTS TAB ── */}
      <AnimatePresence mode="wait">
        {tab === "alerts" && (
          <motion.div key="alerts" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="space-y-4">
            {/* Summary row */}
            {!alertsLoading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Critical", count: critical.length, color: "#FF4466" },
                  { label: "Warnings",  count: warning.length,  color: "#FFC107" },
                  { label: "Total",     count: alerts.length,   color: "var(--text-muted)" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-xs text-subtle mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-subtle">Computed automatically from project + task data</p>
              <button onClick={refreshAlerts} disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-bold transition-colors text-muted hover:text-foreground disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Alert list */}
            {alertsLoading ? (
              <SkeletonList count={4} />
            ) : alerts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl p-10 flex flex-col items-center text-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(16,185,129,0.12)" }}>
                  <CheckCircle className="w-6 h-6" style={{ color: "#10B981" }} />
                </div>
                <p className="text-sm font-bold text-foreground">No active risks detected</p>
                <p className="text-xs text-muted mt-1">All projects and team members are within healthy parameters.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => <AlertCard key={alert.id} alert={alert} i={i} />)}
              </div>
            )}
          </motion.div>
        )}

        {/* ── HEALTH TAB ── */}
        {tab === "health" && (
          <motion.div key="health" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {projects.map((project, i) => {
                  const analysis  = analyses[project.id];
                  const isAnalyzing = analyzing === project.id;
                  return (
                    <motion.div key={project.id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="rounded-2xl p-5"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ background: project.color }} />
                            <h3 className="font-semibold text-foreground text-sm">{project.name}</h3>
                          </div>
                          {project.clientName && <p className="text-xs text-muted">{project.clientName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" loading={predicting === project.id}
                            icon={predicting === project.id ? undefined : <Calendar className="w-3.5 h-3.5" />}
                            onClick={() => predictDeadline(project.id)}>
                            Predict
                          </Button>
                          <Button variant="outline" size="sm" loading={isAnalyzing}
                            icon={isAnalyzing ? undefined : <Sparkles className="w-3.5 h-3.5" />}
                            onClick={() => analyze(project.id)}>
                            {analysis ? "Refresh" : "Analyze"}
                          </Button>
                        </div>
                      </div>

                      {analysis ? (
                        <div>
                          <div className="flex items-center gap-5 mb-4">
                            <ScoreRing score={analysis.score} />
                            <div>
                              <span className={`text-2xl font-bold ${
                                analysis.grade === "A" ? "text-emerald-500" :
                                analysis.grade === "B" ? "text-blue-500" :
                                analysis.grade === "C" ? "text-amber-500" : "text-red-500"
                              }`}>Grade {analysis.grade}</span>
                              <p className="text-xs text-muted mt-1">{analysis.summary}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {[
                              { label: "On-time Rate", value: `${analysis.breakdown.onTimeRate}%`, icon: <CheckCircle className="w-3 h-3" /> },
                              { label: "Completion", value: `${analysis.breakdown.completionRate}%`, icon: <TrendingUp className="w-3 h-3" /> },
                            ].map((m) => (
                              <div key={m.label} className="rounded-lg p-2.5" style={{ background: "var(--bg-elevated)" }}>
                                <div className="flex items-center gap-1 text-muted mb-0.5">
                                  {m.icon}<span className="text-[10px]">{m.label}</span>
                                </div>
                                <span className="text-sm font-bold text-foreground">{m.value}</span>
                              </div>
                            ))}
                          </div>
                          {analysis.risks.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-2">Risks</p>
                              <div className="space-y-1">
                                {analysis.risks.slice(0, 2).map((r, j) => (
                                  <div key={j} className="flex gap-2 text-xs text-muted">
                                    <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />{r}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysis.recommendations.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-2">Recommendations</p>
                              <div className="space-y-1">
                                {analysis.recommendations.slice(0, 2).map((r, j) => (
                                  <div key={j} className="flex gap-2 text-xs text-muted">
                                    <CheckCircle className="w-3 h-3 text-success shrink-0 mt-0.5" />{r}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6 text-center">
                          <Heart className="w-8 h-8 mb-2" style={{ color: "var(--accent)", opacity: 0.3 }} />
                          <p className="text-xs text-muted">Click Analyze for AI-powered health insights</p>
                        </div>
                      )}

                      {/* Deadline Prediction */}
                      {predictions[project.id] && (() => {
                        const pred = predictions[project.id];
                        return (
                          <div className="mt-4 rounded-xl p-3 space-y-2"
                            style={{ background: pred.onTrack ? "rgba(0,240,144,0.07)" : "rgba(255,68,102,0.07)", border: `1px solid ${pred.onTrack ? "rgba(0,240,144,0.25)" : "rgba(255,68,102,0.25)"}` }}>
                            <div className="flex items-center gap-2">
                              <Target className="w-3.5 h-3.5" style={{ color: pred.onTrack ? "#00F090" : "#FF4466" }} />
                              <span className="text-xs font-black" style={{ color: pred.onTrack ? "#00F090" : "#FF4466" }}>
                                {pred.onTrack ? "On Track" : `${Math.abs(pred.daysEarlyOrLate)}d ${pred.daysEarlyOrLate < 0 ? "Late" : "Early"}`}
                              </span>
                              <span className="text-[10px] text-muted ml-auto">Confidence: {pred.confidence}</span>
                            </div>
                            {pred.predictedDate && (
                              <p className="text-xs text-muted">Predicted completion: <strong className="text-foreground">{pred.predictedDate}</strong> · Need {pred.velocityNeeded} tasks/wk</p>
                            )}
                            <p className="text-xs text-muted">{pred.recommendation}</p>
                          </div>
                        );
                      })()}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
