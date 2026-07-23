"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Rocket, Code2, Palette, LineChart, ArrowRight,
  Check, Building2, User,
} from "lucide-react";
import toast from "react-hot-toast";

interface OnboardingWizardProps { onComplete: () => void; }

const TEAM_SIZES   = ["Just me", "2–5", "6–15", "16–50", "50+"];
const WORK_TYPES   = [
  { id: "software",  label: "Software Dev",   icon: Code2,      color: "#9D6BFF" },
  { id: "design",    label: "Design",          icon: Palette,    color: "#EC4899" },
  { id: "marketing", label: "Marketing",       icon: LineChart,  color: "#00CFFF" },
  { id: "ops",       label: "Operations",      icon: Building2,  color: "#FFC107" },
  { id: "freelance", label: "Freelance",       icon: User,       color: "#00F090" },
  { id: "other",     label: "Other",           icon: Zap,        color: "#60A5FA" },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData]   = useState({ teamSize: "", workType: "", goals: [] as string[], projectName: "" });
  const [creating, setCreating] = useState(false);
  const totalSteps = 4;

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setCreating(true);
    try {
      if (data.projectName.trim()) {
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.projectName,
            description: `Created during onboarding — ${data.workType} workspace`,
            color: "#9D6BFF",
            status: "ACTIVE",
          }),
        });
      }
      toast.success("Workspace configured! Let's get started 🚀");
      onComplete();
    } finally { setCreating(false); }
  };

  const steps = [
    {
      title: "Welcome to Colliq",
      subtitle: "Let's set up your workspace in 60 seconds.",
      content: (
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 0 40px rgba(157,107,255,0.60)" }}>
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Ready to get organised?</h2>
          <p className="text-sm text-muted max-w-xs mx-auto">Answer 3 quick questions and we'll configure your workspace automatically.</p>
        </div>
      ),
      canProceed: true,
    },
    {
      title: "Team size",
      subtitle: "How many people will be using Colliq?",
      content: (
        <div className="grid grid-cols-3 gap-2.5">
          {TEAM_SIZES.map((size) => (
            <button key={size} onClick={() => setData((d) => ({ ...d, teamSize: size }))}
              className="px-3 py-3 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: data.teamSize === size ? "var(--accent-muted)" : "var(--bg-elevated)",
                border: `1.5px solid ${data.teamSize === size ? "var(--accent)" : "var(--border)"}`,
                color: data.teamSize === size ? "var(--accent)" : "var(--text-muted)",
              }}>
              {data.teamSize === size && <Check className="w-3 h-3 inline mr-1" />}
              {size}
            </button>
          ))}
        </div>
      ),
      canProceed: !!data.teamSize,
    },
    {
      title: "Type of work",
      subtitle: "What does your team primarily work on?",
      content: (
        <div className="grid grid-cols-2 gap-2.5">
          {WORK_TYPES.map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => setData((d) => ({ ...d, workType: id }))}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left"
              style={{
                background: data.workType === id ? `${color}14` : "var(--bg-elevated)",
                border: `1.5px solid ${data.workType === id ? color : "var(--border)"}`,
                color: data.workType === id ? color : "var(--text-muted)",
              }}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {data.workType === id && <Check className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </div>
      ),
      canProceed: !!data.workType,
    },
    {
      title: "Create your first project",
      subtitle: "Give your first project a name to get started immediately.",
      content: (
        <div className="space-y-4">
          <input value={data.projectName} onChange={(e) => setData((d) => ({ ...d, projectName: e.target.value }))}
            placeholder="e.g. Website Redesign, Q2 Campaign, Sprint 1…"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: data.projectName ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              color: "var(--text-foreground)",
              boxShadow: data.projectName ? "0 0 0 4px var(--accent-muted)" : "none",
            }}
          />
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-subtle uppercase tracking-wider">Or start with these common names</p>
            <div className="flex flex-wrap gap-2">
              {["Sprint 1", "Website Redesign", "Q3 Goals", "Client Project", "Personal Tasks"].map((name) => (
                <button key={name} onClick={() => setData((d) => ({ ...d, projectName: name }))}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      canProceed: true, // project name is optional
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,15,0.90)", backdropFilter: "blur(12px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.90), 0 0 0 1px rgba(157,107,255,0.15)",
        }}>

        {/* Progress bar */}
        <div className="h-1" style={{ background: "var(--bg-elevated)" }}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ background: "linear-gradient(90deg, #9D6BFF, #00CFFF)" }} />
        </div>

        <div className="p-7">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                  style={{
                    background: i < step ? "var(--success)" : i === step ? "var(--accent)" : "var(--bg-elevated)",
                    color: i <= step ? "white" : "var(--text-subtle)",
                  }}>
                  {i < step ? <Check className="w-2.5 h-2.5" /> : i + 1}
                </div>
                {i < totalSteps - 1 && <div className="w-8 h-px" style={{ background: i < step ? "var(--success)" : "var(--border)" }} />}
              </div>
            ))}
            <span className="ml-auto text-[10px] text-subtle">{step + 1} / {totalSteps}</span>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}>
              {step !== 0 && (
                <div className="mb-5">
                  <h3 className="text-lg font-black text-foreground">{current.title}</h3>
                  <p className="text-sm text-muted mt-0.5">{current.subtitle}</p>
                </div>
              )}
              {current.content}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-7">
            {step > 0 && (
              <button onClick={back}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
                Back
              </button>
            )}
            <button
              onClick={step === totalSteps - 1 ? finish : next}
              disabled={!current.canProceed || creating}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 4px 24px rgba(157,107,255,0.50)" }}>
              {creating ? "Setting up…" : step === totalSteps - 1 ? (
                <><Rocket className="w-4 h-4" /> Launch Workspace</>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {step === totalSteps - 1 && (
            <button onClick={onComplete} className="w-full mt-2 text-[11px] text-subtle hover:text-muted text-center transition-colors">
              Skip for now
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
