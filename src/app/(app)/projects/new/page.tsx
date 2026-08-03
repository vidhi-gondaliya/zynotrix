"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, ArrowLeft, ArrowRight, Sparkles, Wand2,
  Check, RefreshCw, Calendar, User, Palette, AlignLeft,
  LayoutTemplate, Rocket, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BOARD_TEMPLATES, COLOR_PALETTE, DONE_COLUMNS } from "@/lib/board-templates";
import type { BoardConfig, BoardColumnConfig } from "@/types";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/api-error";

// ── Data ──────────────────────────────────────────────────────────────────────
const PROJECT_COLORS = [
  "#9D6BFF", "#00CFFF", "#00F090", "#FF4466",
  "#FFC107", "#EC4899", "#60A5FA", "#FB923C",
];
const STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Active",    color: "#00F090" },
  { value: "PLANNING",  label: "Planning",  color: "#60A5FA" },
  { value: "ON_HOLD",   label: "On Hold",   color: "#FFC107" },
  { value: "COMPLETED", label: "Completed", color: "#6B7280" },
];
const TEMPLATE_EMOJI: Record<string, string> = {
  simple: "📋", development: "💻", marketing: "📣", agile: "🔄", design: "🎨",
};

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basics",    icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 2, label: "Details",   icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { id: 3, label: "Board",     icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
];

// ── Field helpers ─────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-1.5">{children}</p>;
}
function Field({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`space-y-0 ${className}`}>{children}</div>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", color: PROJECT_COLORS[0],
    clientName: "", deadline: "", status: "ACTIVE",
  });

  // AI description
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // AI template suggestion
  const [suggestingTemplate, setSuggestingTemplate] = useState(false);
  const [templateSuggestion, setTemplateSuggestion] = useState<{ templateId: string; reason: string } | null>(null);
  const [chosenTemplate, setChosenTemplate] = useState<{ id: string; config: BoardConfig } | null>(null);

  // Inline template editor
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editColumns, setEditColumns] = useState<BoardColumnConfig[]>([]);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

  // Custom from scratch
  const [buildingCustom, setBuildingCustom] = useState(false);
  const [customCols, setCustomCols] = useState<BoardColumnConfig[]>([
    { id: "TODO", label: "To Do", color: "#60A5FA", group: "progress" },
    { id: "IN_PROGRESS", label: "In Progress", color: "#A78BFA", group: "progress" },
  ]);
  const [customColorIdx, setCustomColorIdx] = useState<number | null>(null);

  const generateDescription = async () => {
    if (!form.name.trim()) { toast.error("Enter a project name first"); return; }
    setGeneratingDesc(true);
    setForm((f) => ({ ...f, description: "" }));
    try {
      const res = await fetch("/api/ai/project-description", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, clientName: form.clientName, status: form.status }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setForm((f) => ({ ...f, description: text }));
      }
    } catch { toast.error("Failed to generate description"); }
    finally { setGeneratingDesc(false); }
  };

  const suggestTemplate = async () => {
    if (!form.name.trim()) { toast.error("Enter a project name first"); return; }
    setSuggestingTemplate(true);
    setTemplateSuggestion(null);
    try {
      const res = await fetch("/api/ai/project-template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplateSuggestion(data);
    } catch { toast.error("Failed to suggest template"); }
    finally { setSuggestingTemplate(false); }
  };

  const applyTemplate = (id: string, customCols?: BoardColumnConfig[]) => {
    const tpl = BOARD_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const cols = customCols ?? tpl.columns;
    setChosenTemplate({ id: tpl.id, config: { templateId: tpl.id, columns: cols } });
    if (!customCols) toast.success(`${tpl.name} template applied`);
  };

  const openEdit = (id: string) => {
    const tpl = BOARD_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    // Seed with current customization if already chosen this template
    const current = chosenTemplate?.id === id
      ? (chosenTemplate.config.columns ?? tpl.columns)
      : tpl.columns;
    setEditColumns(current.filter((c) => c.group === "progress"));
    setEditingTemplateId(id);
    setColorPickerIdx(null);
  };

  const saveEditedTemplate = () => {
    if (!editingTemplateId) return;
    const allCols = [...editColumns, ...DONE_COLUMNS];
    applyTemplate(editingTemplateId, allCols);
    setEditingTemplateId(null);
    toast.success("Custom columns saved");
  };

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(chosenTemplate ? { boardConfig: JSON.stringify(chosenTemplate.config) } : {}),
        }),
      });
      if (res.ok) {
        const p = await res.json();
        toast.success("Project created!");
        router.push(`/projects/${p.id}/board?new=1`);
      } else {
        toast.error(await getApiError(res, "Failed to create project"));
        setCreating(false);
      }
    } catch { toast.error("Couldn't reach the server — check your connection"); setCreating(false); }
  };

  const chosenTpl = chosenTemplate ? BOARD_TEMPLATES.find((t) => t.id === chosenTemplate.id) : null;
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--bg-base)" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden
        style={{ background: `radial-gradient(600px circle at 50% 40%, ${form.color}0D, transparent 70%)` }} />

      <div className="relative w-full max-w-lg">

        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute -top-10 left-0 flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
        </button>

        {/* Top: icon + title */}
        <div className="flex items-center gap-4 mb-8">
          <motion.div
            animate={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}99)`, boxShadow: `0 0 28px ${form.color}50` }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
            <FolderKanban className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-foreground leading-tight">
              {form.name || "New Project"}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {step === 1 ? "Give your project a name and color" :
               step === 2 ? "Add more context and details" :
               "Choose a board template to get started"}
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                  style={{
                    background: step >= s.id ? form.color : "var(--bg-elevated)",
                    color: step >= s.id ? "#fff" : "var(--text-subtle)",
                    boxShadow: step === s.id ? `0 0 16px ${form.color}60` : "none",
                  }}>
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="text-xs font-semibold hidden sm:block"
                  style={{ color: step >= s.id ? "var(--text-foreground)" : "var(--text-subtle)" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-1 transition-all duration-300"
                  style={{ background: step > s.id ? form.color : "var(--border)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step panels */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── Step 1: Basics ── */}
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-6 space-y-5">

                <Field>
                  <FieldLabel>Project Name *</FieldLabel>
                  <input autoFocus required value={form.name}
                    onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setTemplateSuggestion(null); }}
                    placeholder="e.g. Website Redesign, Mobile App v2…"
                    className="w-full px-4 py-3 rounded-2xl text-base font-bold text-foreground placeholder:text-subtle outline-none transition-all"
                    style={{
                      background: "var(--bg-elevated)",
                      border: form.name ? `2px solid ${form.color}` : "2px solid var(--border)",
                      boxShadow: form.name ? `0 0 0 4px ${form.color}12` : "none",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && form.name.trim() && go(2)} />
                </Field>

                <Field>
                  <FieldLabel><Palette className="w-3 h-3 inline mr-1" /> Project Color</FieldLabel>
                  <div className="flex gap-2.5 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                        className="w-9 h-9 rounded-2xl transition-all duration-200"
                        style={{
                          background: c,
                          boxShadow: form.color === c ? `0 0 0 3px var(--bg-card), 0 0 0 5px ${c}, 0 4px 16px ${c}50` : `0 2px 8px ${c}30`,
                          transform: form.color === c ? "scale(1.18)" : "scale(1)",
                        }}>
                        {form.color === c && <Check className="w-4 h-4 text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <label key={s.value}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: form.status === s.value ? `${s.color}12` : "var(--bg-elevated)",
                          border: `1.5px solid ${form.status === s.value ? s.color + "60" : "transparent"}`,
                        }}>
                        <input type="radio" name="status" value={s.value} checked={form.status === s.value}
                          onChange={() => setForm((f) => ({ ...f, status: s.value }))} className="sr-only" />
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-xs font-semibold"
                          style={{ color: form.status === s.value ? s.color : "var(--text-muted)" }}>
                          {s.label}
                        </span>
                        {form.status === s.value && <Check className="w-3 h-3 ml-auto" style={{ color: s.color }} />}
                      </label>
                    ))}
                  </div>
                </Field>
              </motion.div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-6 space-y-5">

                <Field>
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel>Description</FieldLabel>
                    <button type="button" onClick={generateDescription} disabled={generatingDesc}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}>
                      {generatingDesc
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Writing…</>
                        : <><Sparkles className="w-3 h-3" />AI Write</>
                      }
                    </button>
                  </div>
                  <textarea rows={4} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What's this project about? (or click AI Write ↑)"
                    className="w-full px-4 py-3 rounded-2xl text-sm text-foreground placeholder:text-subtle outline-none resize-none transition-all"
                    style={{
                      background: "var(--bg-elevated)",
                      border: generatingDesc ? `1.5px solid ${form.color}` : "1.5px solid var(--border)",
                      boxShadow: generatingDesc ? `0 0 0 3px ${form.color}12` : "none",
                    }} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel><User className="w-3 h-3 inline mr-1" /> Client</FieldLabel>
                    <input value={form.clientName}
                      onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                      placeholder="Optional client name"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none transition-all"
                      style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
                  </Field>
                  <Field>
                    <FieldLabel><Calendar className="w-3 h-3 inline mr-1" /> Deadline</FieldLabel>
                    <input type="date" value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none transition-all"
                      style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
                  </Field>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Board ── */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-6 space-y-4">

                {/* AI Suggest */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">Board Template</p>
                    <p className="text-[11px] text-muted mt-0.5">Pick a workflow or let AI choose</p>
                  </div>
                  <button type="button" onClick={suggestTemplate} disabled={suggestingTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}>
                    {suggestingTemplate
                      ? <><RefreshCw className="w-3 h-3 animate-spin" />Thinking…</>
                      : <><Wand2 className="w-3 h-3" />AI Suggest</>
                    }
                  </button>
                </div>

                {/* AI suggestion banner */}
                <AnimatePresence>
                  {templateSuggestion && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-2xl p-3 flex items-center gap-3"
                      style={{ background: `${form.color}10`, border: `1.5px solid ${form.color}30` }}>
                      <span className="text-xl">{TEMPLATE_EMOJI[templateSuggestion.templateId] ?? "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground capitalize">{templateSuggestion.templateId}</p>
                        <p className="text-[10px] text-muted truncate">{templateSuggestion.reason}</p>
                      </div>
                      {chosenTemplate?.id === templateSuggestion.templateId ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: "rgba(0,240,144,0.15)", color: "#00F090" }}>✓ Applied</span>
                      ) : (
                        <button type="button" onClick={() => applyTemplate(templateSuggestion.templateId)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: form.color, color: "#fff" }}>Apply</button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Template grid */}
                <div className="grid grid-cols-1 gap-2">
                  {BOARD_TEMPLATES.map((tpl) => {
                    const isSelected = chosenTemplate?.id === tpl.id;
                    const isAI       = templateSuggestion?.templateId === tpl.id;
                    const isEditing  = editingTemplateId === tpl.id;
                    /* Show customised columns if this template was edited */
                    const displayCols = (isSelected && chosenTemplate?.id === tpl.id)
                      ? (chosenTemplate.config.columns ?? tpl.columns).filter((c) => c.group === "progress")
                      : tpl.columns.filter((c) => c.group === "progress");
                    return (
                      <div key={tpl.id} className="rounded-2xl overflow-hidden"
                        style={{
                          background: isSelected ? `${form.color}10` : "var(--bg-elevated)",
                          border: `1.5px solid ${isSelected ? form.color + "50" : isAI ? form.color + "30" : "transparent"}`,
                          boxShadow: isSelected ? `0 0 0 2px ${form.color}20` : "none",
                        }}>

                        {/* Row */}
                        <button type="button" onClick={() => applyTemplate(tpl.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all group">
                          <span className="text-xl shrink-0">{TEMPLATE_EMOJI[tpl.id] ?? "📋"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold" style={{ color: "var(--text-foreground)" }}>{tpl.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {displayCols.slice(0, 4).map((c) => (
                                <span key={c.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: c.color + "18", color: c.color }}>
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isAI && !isSelected && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                style={{ background: `${form.color}18`, color: form.color }}>AI Pick</span>
                            )}
                            {/* Edit columns button */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); isEditing ? setEditingTemplateId(null) : openEdit(tpl.id); }}
                              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                              style={{
                                background: isEditing ? `${form.color}20` : "var(--bg-card)",
                                color: isEditing ? form.color : "var(--text-muted)",
                                border: `1px solid ${isEditing ? form.color + "40" : "var(--border)"}`,
                              }}
                            >
                              {isEditing ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            {isSelected
                              ? <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ background: form.color }}><Check className="w-3 h-3 text-white" /></div>
                              : <div className="w-5 h-5 rounded-full group-hover:opacity-60 transition-opacity"
                                  style={{ border: "1.5px solid var(--border)" }} />
                            }
                          </div>
                        </button>

                        {/* Inline column editor */}
                        <AnimatePresence initial={false}>
                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                  Customize columns
                                </p>
                                {editColumns.map((col, idx) => (
                                  <div key={col.id} className="flex items-center gap-2">
                                    {/* Color swatch */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setColorPickerIdx(colorPickerIdx === idx ? null : idx)}
                                        className="w-6 h-6 rounded-lg border-2"
                                        style={{ background: col.color, borderColor: col.color + "60" }}
                                      />
                                      {colorPickerIdx === idx && (
                                        <>
                                          <div className="fixed inset-0 z-10" onClick={() => setColorPickerIdx(null)} />
                                          <div className="absolute top-full mt-1 left-0 z-20 p-2 rounded-xl grid grid-cols-6 gap-1"
                                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>
                                            {COLOR_PALETTE.map((hex) => (
                                              <button key={hex} type="button"
                                                onClick={() => {
                                                  setEditColumns((prev) => prev.map((c, i) => i === idx ? { ...c, color: hex } : c));
                                                  setColorPickerIdx(null);
                                                }}
                                                className="w-5 h-5 rounded-md"
                                                style={{ background: hex, outline: col.color === hex ? `2px solid white` : "none" }}
                                              />
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <input
                                      value={col.label}
                                      onChange={(e) => setEditColumns((prev) => prev.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))}
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none"
                                      style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                                      placeholder={`Column ${idx + 1}`}
                                    />
                                    {editColumns.length > 1 && (
                                      <button type="button" onClick={() => setEditColumns((p) => p.filter((_, i) => i !== idx))}
                                        className="p-1 rounded-lg transition-colors" style={{ color: "var(--text-subtle)" }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 pt-1">
                                  <button type="button"
                                    onClick={() => setEditColumns((p) => [...p, { id: `STAGE_${Date.now()}`, label: "", color: COLOR_PALETTE[p.length % COLOR_PALETTE.length], group: "progress" as const }])}
                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                    style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                                    <Plus className="w-3 h-3" /> Add column
                                  </button>
                                  <button type="button" onClick={saveEditedTemplate}
                                    className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white ml-auto"
                                    style={{ background: form.color }}>
                                    <Check className="w-3 h-3" /> Save
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Custom from scratch */}
                <div className="rounded-2xl overflow-hidden"
                  style={{
                    background: buildingCustom || chosenTemplate?.id === "custom" ? `${form.color}10` : "var(--bg-elevated)",
                    border: `1.5px dashed ${buildingCustom || chosenTemplate?.id === "custom" ? form.color + "60" : "var(--border)"}`,
                  }}>
                  <button type="button"
                    onClick={() => { setBuildingCustom((v) => !v); setEditingTemplateId(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all">
                    <span className="text-xl">✏️</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: "var(--text-foreground)" }}>Start from Scratch</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Build your own custom columns</p>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}>
                      {buildingCustom ? "▲ Hide" : "▼ Open"}
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {buildingCustom && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <p className="text-[10px] font-black uppercase tracking-wider pt-3" style={{ color: "var(--text-muted)" }}>Your columns</p>
                          {customCols.map((col, idx) => (
                            <div key={col.id} className="flex items-center gap-2">
                              <div className="relative">
                                <button type="button" onClick={() => setCustomColorIdx(customColorIdx === idx ? null : idx)}
                                  className="w-6 h-6 rounded-lg border-2" style={{ background: col.color, borderColor: col.color + "60" }} />
                                {customColorIdx === idx && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setCustomColorIdx(null)} />
                                    <div className="absolute top-full mt-1 left-0 z-20 p-2 rounded-xl grid grid-cols-6 gap-1"
                                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>
                                      {COLOR_PALETTE.map((hex) => (
                                        <button key={hex} type="button"
                                          onClick={() => { setCustomCols((p) => p.map((c, i) => i === idx ? { ...c, color: hex } : c)); setCustomColorIdx(null); }}
                                          className="w-5 h-5 rounded-md" style={{ background: hex, outline: col.color === hex ? "2px solid white" : "none" }} />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <input value={col.label} onChange={(e) => setCustomCols((p) => p.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))}
                                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none"
                                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                                placeholder={`Column ${idx + 1}`} />
                              {customCols.length > 1 && (
                                <button type="button" onClick={() => setCustomCols((p) => p.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-lg" style={{ color: "var(--text-subtle)" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-1">
                            <button type="button"
                              onClick={() => setCustomCols((p) => [...p, { id: `COL_${Date.now()}`, label: "", color: COLOR_PALETTE[p.length % COLOR_PALETTE.length], group: "progress" as const }])}
                              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                              <Plus className="w-3 h-3" /> Add column
                            </button>
                            <button type="button"
                              onClick={() => {
                                const allCols = [...customCols.filter((c) => c.label.trim()), ...DONE_COLUMNS];
                                setChosenTemplate({ id: "custom", config: { templateId: "custom", columns: allCols } });
                                setBuildingCustom(false);
                                toast.success("Custom board saved");
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white ml-auto"
                              style={{ background: form.color }}>
                              <Check className="w-3 h-3" /> Use this board
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!chosenTemplate && (
                  <p className="text-[11px] text-center py-1" style={{ color: "var(--text-subtle)" }}>
                    No template selected — a simple board will be created
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer nav */}
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
            {step > 1 ? (
              <button type="button" onClick={() => go(step - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button type="button" onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
                Cancel
              </button>
            )}

            <div className="flex-1" />

            {step < 3 ? (
              <button type="button" onClick={() => go(step + 1)}
                disabled={step === 1 && !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: form.color, boxShadow: `0 4px 20px ${form.color}40` }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={submit}
                disabled={!form.name.trim() || creating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}BB)`, boxShadow: `0 4px 24px ${form.color}50` }}>
                {creating
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Creating…</>
                  : <><Rocket className="w-4 h-4" />Launch Project</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {STEPS.map((s) => (
            <div key={s.id} className="rounded-full transition-all duration-300"
              style={{
                width: step === s.id ? "24px" : "6px",
                height: "6px",
                background: step >= s.id ? form.color : "var(--border)",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
