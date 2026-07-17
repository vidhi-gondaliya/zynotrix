"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, RefreshCw, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string; action: string; entityType: string; entityId: string;
  changes: string | null; createdAt: string;
  user: { id: string; name: string; image?: string };
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "#00F090", UPDATE: "#FFC107", DELETE: "#FF4466",
};
const ACTION_BG: Record<string, string> = {
  CREATE: "rgba(0,240,144,0.08)", UPDATE: "rgba(255,193,7,0.08)", DELETE: "rgba(255,68,102,0.08)",
};

export default function AuditPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [entityType, setEntityType] = useState("");
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(true);
  const LIMIT = 50;

  const ENTITY_TYPES = ["task", "project", "comment", "sprint", "customField", "automation"];

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    const qs = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) });
    if (entityType) qs.set("entityType", entityType);
    const res = await fetch(`/api/audit?${qs}`).then((r) => r.json());
    if (reset) {
      setLogs(res);
      setOffset(LIMIT);
    } else {
      setLogs((prev) => [...prev, ...res]);
      setOffset((o) => o + LIMIT);
    }
    setHasMore(res.length === LIMIT);
    setLoading(false);
  }, [entityType, offset]);

  useEffect(() => { load(true); }, [entityType]);

  function parseChanges(raw: string | null) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)" }}>
            <Shield className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Audit Log</h1>
            <p className="text-xs text-muted mt-0.5">Track every change in your workspace</p>
          </div>
        </div>
        <button onClick={() => load(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-muted transition-colors hover:text-foreground"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted shrink-0" />
        <button onClick={() => setEntityType("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${!entityType ? "text-white" : "text-muted"}`}
          style={!entityType ? { background: "var(--accent)" } : { background: "var(--bg-elevated)" }}>
          All
        </button>
        {ENTITY_TYPES.map((t) => (
          <button key={t} onClick={() => setEntityType(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${entityType === t ? "text-white" : "text-muted"}`}
            style={entityType === t ? { background: "var(--accent)" } : { background: "var(--bg-elevated)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Log entries */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield className="w-10 h-10 text-muted" />
          <p className="text-sm font-semibold text-muted">No audit logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const changes = parseChanges(log.changes);
            return (
              <motion.div key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01 }}
                className="rounded-xl px-4 py-3 flex items-start gap-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {/* Action badge */}
                <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg min-w-[52px] text-center mt-0.5"
                  style={{ background: ACTION_BG[log.action] ?? "var(--bg-elevated)", color: ACTION_COLOR[log.action] ?? "var(--text-muted)" }}>
                  {log.action}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{log.user.name}</span>
                    <span className="text-xs text-muted">{log.action.toLowerCase()}d a</span>
                    <span className="text-xs font-bold capitalize"
                      style={{ color: "var(--accent)" }}>{log.entityType}</span>
                  </div>
                  {changes && (
                    <div className="mt-1.5 text-xs text-muted font-mono space-y-0.5">
                      {Object.entries(changes).slice(0, 3).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-subtle">{key}:</span>
                          <span className="text-foreground truncate max-w-xs">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted" title={format(new Date(log.createdAt), "PPpp")}>
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-[10px] text-subtle mt-0.5 capitalize">{log.entityType}</p>
                </div>
              </motion.div>
            );
          })}

          {hasMore && (
            <button onClick={() => load(false)} disabled={loading}
              className="w-full h-10 rounded-xl text-xs font-bold text-muted transition-colors hover:text-foreground"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
