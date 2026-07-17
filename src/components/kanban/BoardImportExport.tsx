"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertTriangle, RefreshCw, Info, FileDown, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  projectId: string;
  projectName: string;
  onImported: () => void;
  onClose: () => void;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

export function BoardImportExport({ projectId, projectName, onImported, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging,      setDragging]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [result,        setResult]        = useState<ImportResult | null>(null);
  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export-template`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-task-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded — fill it in and upload below");
    } catch { toast.error("Failed to download template"); }
    finally { setDownloading(false); }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      toast.error("Only .xlsx or .csv files are supported");
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const doImport = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const res = await fetch(`/api/projects/${projectId}/import-tasks`, {
        method: "POST",
        body: form,
      });
      const data: ImportResult = await res.json();
      if (!res.ok) { toast.error((data as any).error ?? "Import failed"); return; }
      setResult(data);
      if (data.created > 0) {
        toast.success(`✅ ${data.created} task${data.created > 1 ? "s" : ""} imported!`);
        onImported();
      }
    } catch { toast.error("Upload failed — try again"); }
    finally { setUploading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-end sm:justify-end"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }} />

        {/* Panel */}
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex flex-col h-full sm:h-screen overflow-y-auto"
          style={{
            width: 400,
            background: "var(--bg-sidebar)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>Import / Export</h2>
              <p className="text-xs mt-0.5 truncate max-w-[280px]" style={{ color: "var(--text-muted)" }}>{projectName}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-subtle)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-6">

            {/* ── Step 1: Download template ──────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: "var(--accent)" }}>1</span>
                <h3 className="text-[13px] font-black" style={{ color: "var(--text-foreground)" }}>Download Template</h3>
              </div>

              <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(34,197,94,0.12)" }}>
                    <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--success)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text-foreground)" }}>Excel template (.xlsx)</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      Pre-filled with your project&apos;s columns. Status and assignee dropdowns are built in — just click and select.
                    </p>
                  </div>
                </div>

                {/* What's inside */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "Title, Description",
                    "Status dropdown ✓",
                    "Priority dropdown ✓",
                    "Assignee dropdown ✓",
                    "Due date, Start date",
                    "Hours, Story points, Tags",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                      <ChevronRight className="w-2.5 h-2.5 shrink-0" style={{ color: "var(--accent)" }} />
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={downloadTemplate}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--success), #0D8A3A)", boxShadow: "0 3px 12px rgba(22,163,74,0.3)" }}
                >
                  {downloading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><FileDown className="w-4 h-4" /> Download Template</>}
                </button>
              </div>
            </section>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>then</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            {/* ── Step 2: Fill in Excel ──────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: "var(--accent)" }}>2</span>
                <h3 className="text-[13px] font-black" style={{ color: "var(--text-foreground)" }}>Fill in the Template</h3>
              </div>

              <div className="rounded-xl p-3.5 text-xs space-y-1.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {[
                  "Open in Excel or Google Sheets",
                  "Use the dropdowns for Status, Priority, Assignee",
                  "Delete the grey hint row (row 2) if you like",
                  "Save as .xlsx or export as .csv",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
                    <span className="font-black shrink-0" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                    {tip}
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>then</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            {/* ── Step 3: Upload & Import ────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: "var(--accent)" }}>3</span>
                <h3 className="text-[13px] font-black" style={{ color: "var(--text-foreground)" }}>Upload & Import</h3>
              </div>

              <input ref={fileRef} type="file" accept=".xlsx,.csv" className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragging(false);
                  handleFile(e.dataTransfer.files[0] ?? null);
                }}
                className="rounded-2xl p-5 text-center cursor-pointer transition-all mb-3"
                style={{
                  background: dragging ? "var(--accent-muted)" : selectedFile ? "rgba(22,163,74,0.06)" : "var(--bg-card)",
                  border: `2px dashed ${dragging ? "var(--accent)" : selectedFile ? "var(--success)" : "var(--border)"}`,
                }}
              >
                {selectedFile ? (
                  <div className="space-y-1">
                    <FileSpreadsheet className="w-7 h-7 mx-auto" style={{ color: "var(--success)" }} />
                    <p className="text-xs font-bold" style={{ color: "var(--text-foreground)" }}>{selectedFile.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-7 h-7 mx-auto" style={{ color: "var(--text-subtle)" }} />
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                      Drop your .xlsx or .csv here
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>or click to browse</p>
                  </div>
                )}
              </div>

              <button
                onClick={doImport}
                disabled={!selectedFile || uploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--accent), #7B4AE2)", boxShadow: selectedFile ? "0 3px 16px var(--accent-glow)" : "none" }}
              >
                {uploading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import Tasks</>}
              </button>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3 rounded-xl p-3.5 space-y-2"
                    style={{ background: result.created > 0 ? "rgba(22,163,74,0.08)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-2">
                      {result.created > 0
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />
                        : <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--warning)" }} />}
                      <span className="text-xs font-bold" style={{ color: result.created > 0 ? "var(--success)" : "var(--text-muted)" }}>
                        {result.created > 0 ? `${result.created} task${result.created > 1 ? "s" : ""} created` : "Nothing imported"}
                        {result.skipped > 0 && `, ${result.skipped} skipped`}
                      </span>
                    </div>
                    {result.warnings.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--warning)" }}>
                          <Info className="w-2.5 h-2.5" /> Remapped:
                        </p>
                        {result.warnings.slice(0, 4).map((w, i) => (
                          <p key={i} className="text-[10px] font-mono pl-3" style={{ color: "var(--text-muted)" }}>{w}</p>
                        ))}
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold" style={{ color: "var(--danger)" }}>Errors:</p>
                        {result.errors.slice(0, 3).map((e, i) => (
                          <p key={i} className="text-[10px] font-mono pl-3" style={{ color: "var(--danger)" }}>{e}</p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

          </div>

          {/* Footer note */}
          <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] text-center" style={{ color: "var(--text-subtle)" }}>
              Imports add new tasks — existing tasks are not affected
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
