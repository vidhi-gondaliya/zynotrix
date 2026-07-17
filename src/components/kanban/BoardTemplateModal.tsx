"use client";
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, ArrowLeft, Palette, Layers } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BOARD_TEMPLATES, COLOR_PALETTE, DONE_COLUMNS } from "@/lib/board-templates";
import type { BoardColumnConfig, BoardConfig } from "@/types";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

interface BoardTemplateModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentConfig?: string | null;
  onApplied?: () => void;
}

type View = "picker" | "custom";

const DEFAULT_CUSTOM_COLUMNS: BoardColumnConfig[] = [
  { id: "TODO",        label: "To Do",       color: "#60A5FA", group: "progress" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#A78BFA", group: "progress" },
];

function labelToId(label: string, existingIds: string[], index: number): string {
  const slug = label.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 32);
  if (!slug) return `STAGE_${index + 1}`;
  if (!existingIds.includes(slug)) return slug;
  let i = 2;
  while (existingIds.includes(`${slug}_${i}`)) i++;
  return `${slug}_${i}`;
}

function ColumnPill({ col }: { col: BoardColumnConfig }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
      style={{ background: col.color + "20", color: col.color, border: `1px solid ${col.color}40` }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
      {col.label}
    </div>
  );
}

export function BoardTemplateModal({ open, onClose, projectId, currentConfig, onApplied }: BoardTemplateModalProps) {
  const [view, setView] = useState<View>("picker");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const prevOpen = useRef(false);

  // Custom builder state — seeded from current config when entering custom view
  const [customColumns, setCustomColumns] = useState<BoardColumnConfig[]>(DEFAULT_CUSTOM_COLUMNS);
  const [editingColor, setEditingColor] = useState<string | null>(null);

  // Reset state each time the modal opens
  useEffect(() => {
    if (open && !prevOpen.current) {
      setView("picker");
      setSelected(null);
      setEditingColor(null);
      // Seed custom columns from the current board config (if it's a custom template)
      try {
        const cfg = currentConfig ? (JSON.parse(currentConfig) as BoardConfig) : null;
        if (cfg?.templateId === "custom" && Array.isArray(cfg.columns)) {
          const progressCols = cfg.columns.filter((c) => c.group === "progress");
          setCustomColumns(progressCols.length > 0 ? progressCols : DEFAULT_CUSTOM_COLUMNS);
        } else {
          setCustomColumns(DEFAULT_CUSTOM_COLUMNS);
        }
      } catch {
        setCustomColumns(DEFAULT_CUSTOM_COLUMNS);
      }
    }
    prevOpen.current = open;
  }, [open, currentConfig]);

  const getActiveTemplateId = () => {
    if (!currentConfig) return "simple";
    try { return (JSON.parse(currentConfig) as BoardConfig).templateId ?? "simple"; }
    catch { return "simple"; }
  };

  const handleApplyTemplate = async (templateId: string) => {
    const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    await save({ templateId: template.id, columns: template.columns });
  };

  const handleApplyCustom = async () => {
    const progressCols = resolveStableIds(customColumns.filter((c) => c.label.trim()));
    const allColumns: BoardColumnConfig[] = [...progressCols, ...DONE_COLUMNS];
    await save({ templateId: "custom", columns: allColumns });
  };

  const save = async (config: BoardConfig) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardConfig: JSON.stringify(config) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Board template applied!");
      onApplied?.();
      onClose();
    } catch {
      toast.error("Failed to apply template");
    } finally {
      setSaving(false);
    }
  };

  const addColumn = () => {
    // Use a counter-based ID for editing stability; stable slug computed at save time
    const newId = `STAGE_${customColumns.length + 1}_${Date.now()}`;
    setCustomColumns((prev) => [...prev, { id: newId, label: "", color: COLOR_PALETTE[prev.length % COLOR_PALETTE.length], group: "progress" }]);
  };

  const removeColumn = (id: string) => {
    setCustomColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<BoardColumnConfig>) => {
    setCustomColumns((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  };

  // Convert temporary editing IDs to stable slug-based IDs at save time
  const resolveStableIds = (cols: BoardColumnConfig[]): BoardColumnConfig[] => {
    const result: BoardColumnConfig[] = [];
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const existingIds = result.map((c) => c.id);
      const stableId = labelToId(col.label, existingIds, i);
      result.push({ ...col, id: stableId });
    }
    return result;
  };

  const activeTemplateId = getActiveTemplateId();

  return (
    <Modal open={open} onClose={() => { onClose(); }} size="xl">
      {view === "picker" ? (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-2xl gradient-premium flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Board Template</h2>
              <p className="text-xs text-muted">Choose a workflow that fits your project</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {BOARD_TEMPLATES.map((t) => {
              const isActive = t.id === activeTemplateId;
              const isSelected = selected === t.id;
              return (
                <motion.button key={t.id}
                  whileHover={{ y: -1 }}
                  onClick={() => setSelected(isSelected ? null : t.id)}
                  className="relative text-left p-4 rounded-2xl transition-all duration-150"
                  style={{
                    background: isSelected ? "var(--accent-muted)" : "var(--bg-elevated)",
                    border: `1.5px solid ${isSelected ? "var(--accent-glow)" : "var(--border)"}`,
                  }}>
                  {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)", color: "white" }}>
                      Active
                    </div>
                  )}
                  {isSelected && !isActive && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "var(--accent)" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="text-xl mb-2">{t.emoji}</div>
                  <div className="text-sm font-bold text-foreground mb-1">{t.name}</div>
                  <div className="text-[11px] text-muted mb-3">{t.description}</div>

                  {/* Column preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {t.columns.filter((c) => c.group === "progress").map((c) => (
                      <ColumnPill key={c.id} col={c} />
                    ))}
                    <div className="flex items-center gap-1 text-[10px] text-subtle font-semibold">
                      + {t.columns.filter((c) => c.group === "done").length} done stages
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {/* Custom option */}
            <motion.button whileHover={{ y: -1 }}
              onClick={() => setView("custom")}
              className="text-left p-4 rounded-2xl transition-all duration-150 flex flex-col"
              style={{ background: "var(--bg-elevated)", border: "1.5px dashed var(--border)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: "var(--accent-muted)" }}>
                <Palette className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-sm font-bold text-foreground mb-1">Custom Board</div>
              <div className="text-[11px] text-muted">Build your own workflow with custom stages</div>
            </motion.button>
          </div>

          {/* Always-present done stages info */}
          <div className="rounded-xl p-3 mb-5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Always included</p>
            <div className="flex flex-wrap gap-1.5">
              {DONE_COLUMNS.map((c) => <ColumnPill key={c.id} col={c} />)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!selected || saving} loading={saving}
              onClick={() => selected && handleApplyTemplate(selected)}>
              Apply Template
            </Button>
          </div>
        </div>
      ) : (
        /* Custom builder */
        <div className="p-6">
          <button onClick={() => setView("picker")}
            className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to templates
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
              <Palette className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Custom Board</h2>
              <p className="text-xs text-muted">Design your own workflow stages</p>
            </div>
          </div>

          {/* In Progress section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-black text-foreground uppercase tracking-wider">In Progress</p>
                <p className="text-[10px] text-muted">Customizable stages</p>
              </div>
              <Button size="xs" variant="ghost" icon={<Plus className="w-3 h-3" />} onClick={addColumn}>
                Add Stage
              </Button>
            </div>

            <div className="space-y-2">
              {customColumns.map((col, idx) => (
                <motion.div key={col.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>

                  {/* Color picker trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setEditingColor(editingColor === col.id ? null : col.id)}
                      className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                      style={{ background: col.color, borderColor: col.color + "60" }}
                    />
                    {editingColor === col.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setEditingColor(null)} />
                        <div className="absolute top-full mt-1 left-0 z-20 p-2 rounded-xl grid grid-cols-6 gap-1 panel shadow-float">
                          {COLOR_PALETTE.map((hex) => (
                            <button key={hex}
                              onClick={() => { updateColumn(col.id, { color: hex }); setEditingColor(null); }}
                              className={`w-5 h-5 rounded-md transition-transform hover:scale-110 ${col.color === hex ? "ring-2 ring-white" : ""}`}
                              style={{ background: hex }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Label input */}
                  <input
                    value={col.label}
                    onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                    placeholder={`Stage ${idx + 1}`}
                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-subtle"
                  />

                  {/* Remove */}
                  {customColumns.length > 1 && (
                    <button onClick={() => removeColumn(col.id)}
                      className="p-1 rounded-lg text-subtle hover:text-danger hover:bg-danger/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Done section — fixed */}
          <div className="mb-6">
            <div className="mb-3">
              <p className="text-xs font-black text-foreground uppercase tracking-wider">Completed</p>
              <p className="text-[10px] text-muted">Always present in all templates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DONE_COLUMNS.map((c) => <ColumnPill key={c.id} col={c} />)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("picker")}>Cancel</Button>
            <Button size="sm" loading={saving}
              disabled={customColumns.every((c) => !c.label.trim())}
              onClick={handleApplyCustom}>
              Apply Custom Board
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
