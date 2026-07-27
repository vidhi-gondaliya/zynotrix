"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function Field({
  label, type = "text", value, onChange, placeholder, icon, iconRight, autoFocus,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ReactNode; iconRight?: React.ReactNode; autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-subtle)" }}>{label}</label>
      <div className="relative group">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-subtle)" }}>{icon}</span>
        )}
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus} required
          className="w-full h-[46px] rounded-xl text-[14px] font-medium outline-none transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1.5px solid var(--border-strong)",
            color: "var(--text-foreground)",
            paddingLeft: icon ? "2.75rem" : "1rem",
            paddingRight: iconRight ? "2.75rem" : "1rem",
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await signIn("credentials", { ...form, redirect: false });
    if (result?.error) { setError("Invalid email or password"); setLoading(false); }
    else router.push(callbackUrl);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>

      {/* ── LEFT: hero panel ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{ width: "52%", background: "#060610" }}>
        <Orb cx="25%" cy="20%" r="480px" color="rgba(79,82,217,0.40)"   delay={0} />
        <Orb cx="75%" cy="65%" r="380px" color="rgba(167,139,250,0.22)" delay={2} />
        <Orb cx="60%" cy="20%" r="280px" color="rgba(251,191,36,0.14)"  delay={4} />
        <Orb cx="15%" cy="80%" r="300px" color="rgba(129,140,248,0.16)" delay={1} />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)", boxShadow: "0 0 24px rgba(129,140,248,0.55)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[17px] font-black tracking-tight text-white">COLLIQ</span>
              <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>by Zynotrix</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-16 space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(129,140,248,0.85)" }}>
              AI Work OS · Project Management Reimagined
            </p>
            <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.04em] text-white">
              Your smartest<br />
              <span style={{
                background: "linear-gradient(135deg, #818CF8 0%, #A78BFA 45%, #FBBF24 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                colleague.
              </span>
            </h1>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Colliq thinks, plans, and works alongside your team — so you ship faster with less friction.
            </p>
          </div>

          <div className="flex items-center gap-10 pt-2">
            {[{ n: "10k+", l: "Teams" }, { n: "99.9%", l: "Uptime" }, { n: "4.9★", l: "Rating" }].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-black text-white">{s.n}</p>
                <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{s.l}</p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[14px] leading-relaxed italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              "Colliq replaced our entire stack — Jira, Confluence, Slack threads. It just works."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)" }}>S</div>
              <div>
                <p className="text-[13px] font-semibold text-white">Sarah K.</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>CTO @ Meridian</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-8">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            © 2026 Zynotrix · <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy</Link>
            {" · "}
            <Link href="/terms" className="hover:text-white/40 transition-colors">Terms</Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: auth form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, rgba(157,107,255,0.07) 0%, transparent 60%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #818CF8, #A78BFA)" }}>
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-[16px] font-black tracking-tight" style={{ color: "var(--text-foreground)" }}>COLLIQ</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-black tracking-[-0.03em]" style={{ color: "var(--text-foreground)" }}>
              Welcome back
            </h2>
            <p className="text-[14px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              Sign in to continue to your workspace
            </p>
          </div>

          {/* Google SSO — primary option */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full h-[48px] rounded-xl flex items-center justify-center gap-3 text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-60 mb-5"
            style={{
              background: "var(--bg-card)",
              border: "1.5px solid var(--border-strong)",
              color: "var(--text-foreground)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
          >
            {googleLoading
              ? <span className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              : <GoogleIcon />
            }
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[12px] font-medium px-1" style={{ color: "var(--text-subtle)" }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="you@company.com"
              icon={<Mail className="w-4 h-4" />}
              autoFocus />

            <Field label="Password" type={showPass ? "text" : "password"} value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button type="button" onClick={() => setShowPass((p) => !p)}
                  className="p-1 rounded transition-colors hover:text-foreground" tabIndex={-1}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[12px] font-semibold transition-colors"
                style={{ color: "var(--accent)" }}>
                Forgot password?
              </Link>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] font-semibold"
                style={{ background: "var(--danger-muted)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--danger)" }} />
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-[48px] rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-60 mt-1"
              style={{
                background: "linear-gradient(135deg, #4F52D9 0%, #7C3AED 100%)",
                boxShadow: "0 4px 24px rgba(79,82,217,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : (<><span>Sign in</span><ArrowRight className="w-4 h-4" /></>)
              }
            </button>
          </form>

          <p className="text-center text-[13px] mt-8" style={{ color: "var(--text-subtle)" }}>
            No account?{" "}
            <Link href="/register" className="font-semibold transition-colors"
              style={{ color: "var(--accent)" }}>
              Create one free
            </Link>
          </p>

          <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-disabled)" }}>
            By signing in you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--text-subtle)" }}>Terms</Link>
            {" & "}
            <Link href="/privacy" style={{ color: "var(--text-subtle)" }}>Privacy Policy</Link>
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
