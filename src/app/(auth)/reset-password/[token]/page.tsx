"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Something went wrong"); }
      else { setDone(true); setTimeout(() => router.push("/login"), 2500); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)" }}>
            <span className="text-white text-[11px] font-black">C</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-black tracking-[-0.04em] leading-none"
              style={{ color: "var(--text-foreground)" }}>COLLIQ</span>
            <span className="text-[8px] font-semibold tracking-widest uppercase leading-none mt-0.5"
              style={{ color: "var(--text-subtle)" }}>by Zynotrix</span>
          </div>
        </div>

        <div className="rounded-[20px] p-8"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: "#22C55E" }} />
              </div>
              <h1 className="text-[20px] font-black tracking-tight mb-2"
                style={{ color: "var(--text-foreground)" }}>Password updated!</h1>
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Redirecting you to login…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-black tracking-tight mb-1"
                style={{ color: "var(--text-foreground)" }}>Set new password</h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
                Choose a strong password for your Colliq account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--text-subtle)" }}>New Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-subtle)" }}>
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPwd ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" required autoFocus
                      className="w-full h-[42px] rounded-[10px] text-[13px] font-medium outline-none transition-all pl-10 pr-10"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-foreground)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-subtle)" }}>
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--text-subtle)" }}>Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-subtle)" }}>
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPwd ? "text" : "password"} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password" required
                      className="w-full h-[42px] rounded-[10px] text-[13px] font-medium outline-none transition-all pl-10 pr-3"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-foreground)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)" }}>
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>

              <p className="text-center mt-5">
                <Link href="/login" className="text-[12px] font-semibold"
                  style={{ color: "var(--text-muted)" }}>Back to login</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
