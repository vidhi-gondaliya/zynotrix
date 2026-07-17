"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

// ── Animated orb (pure CSS, no JS overhead) ───────────────────────────────────
function Orb({ cx, cy, r, color, delay = 0 }: { cx: string; cy: string; r: string; color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: cx, top: cy, width: r, height: r,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        transform: "translate(-50%,-50%)",
      }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
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
      <div className="relative group">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await signIn("credentials", { ...form, redirect: false });
    if (result?.error) { setError("Invalid email or password"); setLoading(false); }
    else router.push(callbackUrl);
  };

  const fill = (email: string) => setForm({ email, password: "password123" });

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>

      {/* ── LEFT: Cinematic hero ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{ width: "52%", background: "#060610" }}>

        {/* Animated orbs */}
        <Orb cx="25%"  cy="20%"  r="480px" color="rgba(79,82,217,0.40)"   delay={0} />
        <Orb cx="75%"  cy="65%"  r="380px" color="rgba(167,139,250,0.22)" delay={2} />
        <Orb cx="60%"  cy="20%"  r="280px" color="rgba(251,191,36,0.14)"  delay={4} />
        <Orb cx="15%"  cy="80%"  r="300px" color="rgba(129,140,248,0.16)" delay={1} />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

        {/* Content */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)", boxShadow: "0 0 24px rgba(129,140,248,0.55)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-black tracking-tight text-white">ZYNOTRIX</span>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-16 space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(129,140,248,0.85)" }}>
              AI-Powered Workspace
            </p>
            <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.04em] text-white">
              Where ambitious<br />
              <span style={{
                background: "linear-gradient(135deg, #818CF8 0%, #A78BFA 45%, #FBBF24 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                teams ship.
              </span>
            </h1>
            <p className="text-[15px] leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.42)" }}>
              Project intelligence, real-time collaboration, and AI that actually helps — in one workspace.
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-8 pt-2">
            {[
              { n: "10k+", l: "Teams" },
              { n: "99.9%", l: "Uptime" },
              { n: "4.9★", l: "Rating" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-xl font-black text-white">{s.n}</p>
                <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[13px] leading-relaxed italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              "ZYNOTRIX replaced our entire stack — Jira, Confluence, Slack threads. It just works."
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)" }}>S</div>
              <div>
                <p className="text-xs font-semibold text-white">Sarah K.</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>CTO @ Meridian</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-8">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>© 2026 ZYNOTRIX Inc.</p>
        </div>
      </div>

      {/* ── RIGHT: Auth form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle bg orb */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, rgba(157,107,255,0.07) 0%, transparent 60%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-black tracking-tight" style={{ color: "var(--text-foreground)" }}>ZYNOTRIX</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-black tracking-[-0.03em]" style={{ color: "var(--text-foreground)" }}>
              Welcome back
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="you@company.com"
              icon={<Mail className="w-[15px] h-[15px]" />}
              autoFocus />

            <Field label="Password" type={showPass ? "text" : "password"} value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder="••••••••"
              icon={<Lock className="w-[15px] h-[15px]" />}
              iconRight={
                <button type="button" onClick={() => setShowPass((p) => !p)}
                  className="p-1 rounded transition-colors hover:text-foreground" tabIndex={-1}>
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

            <button type="submit" disabled={loading}
              className="w-full h-[42px] rounded-[10px] text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
              style={{
                background: loading ? "var(--accent)" : "linear-gradient(135deg, #7C3AED 0%, #9D6BFF 100%)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : (<><span>Sign in</span><ArrowRight className="w-3.5 h-3.5" /></>)
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--text-subtle)" }}>demo accounts</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Demo fills */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Owner",   email: "admin@zynotrix.com", role: "OWNER" },
              { label: "Manager", email: "alice@zynotrix.com", role: "MANAGER" },
            ].map((u) => (
              <button key={u.email} type="button" onClick={() => fill(u.email)}
                className="text-left px-3.5 py-3 rounded-[10px] transition-all group"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-glow)"; e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}>
                <p className="text-[12px] font-bold" style={{ color: "var(--text-foreground)" }}>{u.label}</p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-subtle)" }}>{u.email}</p>
              </button>
            ))}
          </div>

          <p className="text-center text-[12px] mt-8" style={{ color: "var(--text-subtle)" }}>
            No account?{" "}
            <Link href="/register" className="font-semibold transition-colors"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
