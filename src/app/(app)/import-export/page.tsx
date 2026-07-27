"use client";
import { useEffect, useRef, useState } from "react";
import {
  Download, Upload, FileText, FolderKanban, CheckCircle2,
  AlertTriangle, RefreshCw, Table, Braces, FileDown, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Project { id: string; name: string; color: string; }
type ExportType   = "tasks" | "projects";
type ExportFormat = "json" | "csv";

// ── Sample data for download ───────────────────────────────────────
const SAMPLES: Record<string, Record<ExportFormat, string>> = {
  tasks: {
    csv: `title,status,priority,description,dueDate,tags
Build landing page,TODO,HIGH,Create the marketing landing page with hero and pricing sections,2025-08-01,marketing,design
API integration,IN_PROGRESS,MEDIUM,Integrate the payment gateway API,2025-07-20,backend
Write unit tests,BACKLOG,LOW,Add test coverage for auth module,,testing
Design mockups,REVIEW,HIGH,Finalize UI mockups for the onboarding flow,2025-07-15,design
Deploy to staging,TODO,URGENT,Deploy the latest build to staging environment for QA,2025-07-12,devops`,
    json: JSON.stringify([
      { title: "Build landing page", status: "TODO", priority: "HIGH", description: "Create the marketing landing page", dueDate: "2025-08-01", tags: ["marketing", "design"] },
      { title: "API integration",    status: "IN_PROGRESS", priority: "MEDIUM", description: "Integrate the payment gateway API", dueDate: "2025-07-20", tags: ["backend"] },
      { title: "Write unit tests",   status: "BACKLOG", priority: "LOW",  description: "Add test coverage for auth module", tags: ["testing"] },
      { title: "Design mockups",     status: "REVIEW", priority: "HIGH", description: "Finalize UI mockups for onboarding", dueDate: "2025-07-15", tags: ["design"] },
      { title: "Deploy to staging",  status: "TODO", priority: "URGENT", description: "Deploy the latest build to staging", dueDate: "2025-07-12", tags: ["devops"] },
    ], null, 2),
  },
  projects: {
    csv: `name,status,description,clientName,deadline,color
Website Redesign,ACTIVE,Full redesign of the company website including all sub-pages,Acme Corp,2025-09-01,#4F52D9
Mobile App MVP,PLANNING,Build the initial MVP of the iOS and Android app,,2025-12-01,#16A34A
Q3 Marketing Campaign,ON_HOLD,Social media and email campaign for Q3,Globex Inc,2025-08-15,#E99B14`,
    json: JSON.stringify([
      { name: "Website Redesign",       status: "ACTIVE",   description: "Full redesign of the company website", clientName: "Acme Corp",  deadline: "2025-09-01", color: "#4F52D9" },
      { name: "Mobile App MVP",         status: "PLANNING", description: "Build the initial MVP of iOS and Android", deadline: "2025-12-01", color: "#16A34A" },
      { name: "Q3 Marketing Campaign",  status: "ON_HOLD",  description: "Social media and email campaign for Q3", clientName: "Globex Inc", deadline: "2025-08-15", color: "#E99B14" },
    ], null, 2),
  },
};

function downloadSample(type: ExportType, format: ExportFormat) {
  const content  = SAMPLES[type][format];
  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `sample-${type}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Sample ${type} ${format.toUpperCase()} downloaded`);
}

export default function ImportExportPage() {
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [exporting,  setExporting]  = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[]; statusWarnings?: string[] } | null>(null);

  // Export state
  const [exportType,    setExportType]    = useState<ExportType>("tasks");
  const [exportFormat,  setExportFormat]  = useState<ExportFormat>("csv");
  const [exportProject, setExportProject] = useState("");

  // Import state
  const [importType,    setImportType]    = useState<ExportType>("tasks");
  const [importFormat,  setImportFormat]  = useState<ExportFormat>("csv");
  const [importProject, setImportProject] = useState("");
  const [importData,    setImportData]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch((err) => console.error("[import-export] load projects", err));
  }, []);

  const doExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType, format: exportFormat });
      if (exportProject) params.set("projectId", exportProject);
      const res = await fetch(`/api/import-export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${exportType}-export.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as .${exportFormat}`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const doImport = async () => {
    if (!importData.trim()) { toast.error("No data to import"); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/import-export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: importType, format: importFormat,
          data: importFormat === "json" ? (() => { try { return JSON.parse(importData); } catch { return importData; } })() : importData,
          projectId: importProject || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? "Import failed"); return; }
      setImportResult(result);
      if (result.created > 0) toast.success(`Imported ${result.created} ${importType}`);
    } catch (e) { toast.error(String(e)); }
    finally { setImporting(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") setImportFormat("csv");
    if (ext === "json") setImportFormat("json");
    const reader = new FileReader();
    reader.onload = (ev) => setImportData((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  // ── UI helpers ─────────────────────────────────────────────────────
  const Panel = ({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent: string }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--border)", background: `${accent}08` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}20` }}>
          {icon}
        </div>
        <h2 className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--text-subtle)" }}>{children}</p>
  );

  const TabToggle = ({ value, options, onChange, icons }: {
    value: string; options: [string, string][]; onChange: (v: string) => void; icons?: React.ReactNode[];
  }) => (
    <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      {options.map(([v, label], i) => (
        <button key={v} onClick={() => onChange(v)}
          className="flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: value === v ? "var(--bg-card)" : "transparent",
            color: value === v ? "var(--text-foreground)" : "var(--text-subtle)",
            boxShadow: value === v ? "var(--shadow-sm)" : "none",
          }}>
          {icons?.[i]}{label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{
          background: "linear-gradient(135deg, var(--text-foreground) 0%, #34D399 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "-0.03em",
        }}>Import / Export</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Transfer your data in CSV or JSON format</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Export ── */}
        <Panel title="Export" icon={<Download className="w-4 h-4" style={{ color: "#00CFFF" }} />} accent="#00CFFF">
          <div>
            <Label>What to export</Label>
            <TabToggle value={exportType} onChange={(v) => setExportType(v as ExportType)}
              options={[["tasks", "Tasks"], ["projects", "Projects"]]}
              icons={[<CheckCircle2 key="t" className="w-3.5 h-3.5" />, <FolderKanban key="p" className="w-3.5 h-3.5" />]} />
          </div>

          <div>
            <Label>Format</Label>
            <TabToggle value={exportFormat} onChange={(v) => setExportFormat(v as ExportFormat)}
              options={[["csv", "CSV"], ["json", "JSON"]]}
              icons={[<Table key="c" className="w-3.5 h-3.5" />, <Braces key="j" className="w-3.5 h-3.5" />]} />
            <p className="text-[10px] mt-1.5" style={{ color: "var(--text-subtle)" }}>
              {exportFormat === "csv" ? "Opens in Excel / Google Sheets" : "Preserves all fields, nested data"}
            </p>
          </div>

          {exportType === "tasks" && (
            <div>
              <Label>Filter by project (optional)</Label>
              <select value={exportProject} onChange={(e) => setExportProject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)", color: "var(--text-foreground)" }}>
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <button onClick={doExport} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #00CFFF, #0090CC)", boxShadow: "0 4px 20px rgba(0,207,255,0.25)" }}>
            {exporting
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Exporting…</>
              : <><Download className="w-4 h-4" />Export {exportType} as .{exportFormat}</>}
          </button>
        </Panel>

        {/* ── Import ── */}
        <Panel title="Import" icon={<Upload className="w-4 h-4" style={{ color: "#9D6BFF" }} />} accent="#9D6BFF">
          <div>
            <Label>What to import</Label>
            <TabToggle value={importType} onChange={(v) => { setImportType(v as ExportType); setImportResult(null); }}
              options={[["tasks", "Tasks"], ["projects", "Projects"]]}
              icons={[<CheckCircle2 key="t" className="w-3.5 h-3.5" />, <FolderKanban key="p" className="w-3.5 h-3.5" />]} />
          </div>

          <div>
            <Label>Format</Label>
            <TabToggle value={importFormat} onChange={(v) => setImportFormat(v as ExportFormat)}
              options={[["csv", "CSV"], ["json", "JSON"]]}
              icons={[<Table key="c" className="w-3.5 h-3.5" />, <Braces key="j" className="w-3.5 h-3.5" />]} />
          </div>

          {importType === "tasks" && (
            <div>
              <Label>Import into project</Label>
              <select value={importProject} onChange={(e) => setImportProject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)", color: "var(--text-foreground)" }}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {importProject && (
                <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--info)" }}>
                  <Info className="w-3 h-3" />
                  Status values in your file will be matched to this project&apos;s columns automatically.
                </p>
              )}
            </div>
          )}

          {/* Sample download */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
              Download sample:
            </span>
            <button
              onClick={() => downloadSample(importType, importFormat)}
              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all"
              style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--accent-muted)"}
            >
              <FileDown className="w-3 h-3" />
              {importType}.{importFormat}
            </button>
          </div>

          {/* File upload */}
          <div>
            <Label>Upload file or paste data</Label>
            <input ref={fileRef} type="file" accept=".csv,.json" className="sr-only" onChange={handleFileUpload} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-2 transition-all"
              style={{ background: "var(--bg-elevated)", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
              <FileText className="w-4 h-4" /> Click to upload .{importFormat} file
            </button>
            <textarea value={importData} onChange={(e) => setImportData(e.target.value)}
              placeholder={importFormat === "csv"
                ? "Or paste CSV here:\ntitle,status,priority,description\nBuild landing page,TODO,HIGH,"
                : 'Or paste JSON here:\n[{"title":"Build landing page","status":"TODO"}]'}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl text-xs placeholder:text-subtle outline-none resize-none font-mono"
              style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>

          <button onClick={doImport} disabled={importing || !importData.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #9D6BFF, #7B4AE2)", boxShadow: "0 4px 20px rgba(157,107,255,0.25)" }}>
            {importing
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Importing…</>
              : <><Upload className="w-4 h-4" />Import {importType}</>}
          </button>

          {/* Result */}
          <AnimatePresence>
            {importResult && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-4 space-y-2"
                style={{ background: importResult.created > 0 ? "rgba(22,163,74,0.08)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  {importResult.created > 0
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />
                    : <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--warning)" }} />}
                  <span className="text-xs font-bold" style={{ color: importResult.created > 0 ? "var(--success)" : "var(--text-muted)" }}>
                    {importResult.created > 0 ? `${importResult.created} imported successfully` : "Nothing imported"}
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                  </span>
                </div>
                {importResult.statusWarnings && importResult.statusWarnings.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold" style={{ color: "var(--warning)" }}>Status remapping applied:</p>
                    {importResult.statusWarnings.map((w, i) => (
                      <p key={i} className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{w}</p>
                    ))}
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold" style={{ color: "var(--danger)" }}>Errors:</p>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-[10px] font-mono" style={{ color: "var(--danger)" }}>{e}</p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>

      {/* Format reference */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-xs font-black" style={{ color: "var(--text-foreground)" }}>Format Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>Tasks CSV columns</p>
            <code className="text-[10px] font-mono leading-relaxed block" style={{ color: "var(--text-subtle)" }}>
              title, status, priority,<br />
              description, dueDate (YYYY-MM-DD),<br />
              assignee (email), tags (comma-separated)
            </code>
          </div>
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>Status values</p>
            <code className="text-[10px] font-mono leading-relaxed block" style={{ color: "var(--text-subtle)" }}>
              BACKLOG · TODO · IN_PROGRESS<br />
              REVIEW · DONE · ARCHIVED<br />
              <span style={{ color: "var(--info)" }}>or your project&apos;s custom status labels</span>
            </code>
          </div>
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>Priority values</p>
            <code className="text-[10px] font-mono leading-relaxed block" style={{ color: "var(--text-subtle)" }}>
              URGENT · HIGH · MEDIUM · LOW<br />
              <br />
              <span style={{ color: "var(--warning)" }}>Unknown statuses fall back to TODO</span>
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
