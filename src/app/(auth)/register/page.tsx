"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, Zap, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";

function Field({
  label, type = "text", value, onChange, placeholder, icon, iconRight, autoFocus,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ReactNode; iconRight?: React.ReactNode; autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-subtle)" }}>{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-subtle)" }}>{icon}</span>
        )}
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus} required
          className="w-full h-[42px] rounded-[10px] text-[13px] font-medium outline-none transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-foreground)",
            paddingLeft: icon ? "2.5rem" : "0.875rem",
            paddingRight: iconRight ? "2.75rem" : "0.875rem",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-subtle)" }}>{iconRight}</span>
        )}
      </div>
    </div>
  );
}

const PERKS = [
  "14-day free trial, no card required",
  "Unlimited projects and tasks",
  "AI-powered insights from day one",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>

      {/* ── LEFT: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 60%, rgba(157,107,255,0.06) 0%, transparent 55%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] relative z-10">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 0 20px rgba(157,107,255,0.4)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-black tracking-[-0.04em] leading-none" style={{ color: "var(--text-foreground)" }}>COLLIQ</span>
              <span className="text-[8px] font-semibold tracking-widest uppercase leading-none mt-0.5" style={{ color: "var(--text-subtle)" }}>by Zynotrix</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-black tracking-[-0.03em]" style={{ color: "var(--text-foreground)" }}>
              Create your workspace
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
              Free for 14 days. No credit card needed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Sarah Johnson" icon={<User className="w-[15px] h-[15px]" />} autoFocus />

            <Field label="Work Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="you@company.com" icon={<Mail className="w-[15px] h-[15px]" />} />

            <Field label="Password" type={showPass ? "text" : "password"} value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder="Min. 8 characters"
              icon={<Lock className="w-[15px] h-[15px]" />}
              iconRight={
                <button type="button" onClick={() => setShowPass((p) => !p)}
                  className="p-1 rounded transition-opacity hover:opacity-80" tabIndex={-1}>
                  {showPass ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                </button>
              }
            />

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-[12px] font-semibold"
                style={{ background: "var(--danger-muted)", color: "var(--danger)", border: "1px solid rgba(255,68,102,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--danger)" }} />
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading || !form.name || !form.email || !form.password}
              className="w-full h-[42px] rounded-[10px] text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #9D6BFF 100%)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : (<><span>Create account</span><ArrowRight className="w-3.5 h-3.5" /></>)
              }
            </button>
          </form>

          {/* Perks */}
          <div className="mt-6 space-y-2">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--success)" }} />
                <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{perk}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] mt-8" style={{ color: "var(--text-subtle)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT: visual ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden"
        style={{ width: "48%", background: "#060610" }}>

        {/* Orbs */}
        {[
          { left: "30%", top: "25%", size: "420px", color: "rgba(124,58,237,0.32)" },
          { left: "70%", top: "70%", size: "320px", color: "rgba(0,207,255,0.22)" },
          { left: "55%", top: "15%", size: "240px", color: "rgba(236,72,153,0.15)" },
        ].map((orb, i) => (
          <motion.div key={i} className="absolute rounded-full pointer-events-none"
            style={{
              left: orb.left, top: orb.top, width: orb.size, height: orb.size,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              filter: "blur(60px)", transform: "translate(-50%,-50%)",
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
          />
        ))}

        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col h-full justify-center">
          <div className="max-w-sm space-y-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(157,107,255,0.8)" }}>
                Join 10,000+ teams
              </p>
              <h2 className="text-4xl font-black leading-tight tracking-[-0.04em] text-white">
                Ship faster,<br />
                <span style={{
                  background: "linear-gradient(135deg, #A78BFA 0%, #EC4899 50%, #22D3EE 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>stress less.</span>
              </h2>
              <p className="text-[15px] mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                Colliq gives your team the AI edge — from project kickoff to final delivery.
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2">
              {["Ask Colliq", "Kanban Boards", "Team Chat", "Meetings", "Analytics", "Rewards"].map((f) => (
                <span key={f} className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Testimonial */}
            <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] leading-relaxed italic" style={{ color: "rgba(255,255,255,0.55)" }}>
                "We shipped 3x faster in our first month. The AI insights alone saved us 5 hours of planning every week."
              </p>
              <div className="flex items-center gap-2.5 mt-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #00CFFF, #06B6D4)" }}>M</div>
                <div>
                  <p className="text-xs font-semibold text-white">Marcus T.</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Engineering Lead @ Pulse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
