"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong");
      } else {
        setSent(true);
      }
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
        <Link href="/login" className="flex items-center gap-2 mb-8">
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
        </Link>

        <div className="rounded-[20px] p-8"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: "#22C55E" }} />
              </div>
              <h1 className="text-[20px] font-black tracking-tight mb-2"
                style={{ color: "var(--text-foreground)" }}>Check your email</h1>
              <p className="text-[13px] leading-relaxed mb-6"
                style={{ color: "var(--text-muted)" }}>
                If <strong>{email}</strong> has a Colliq account, you'll receive a password reset link shortly.
              </p>
              <Link href="/login"
                className="flex items-center justify-center gap-2 text-[13px] font-semibold"
                style={{ color: "var(--accent)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-black tracking-tight mb-1"
                style={{ color: "var(--text-foreground)" }}>Forgot password?</h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--text-subtle)" }}>Email</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-subtle)" }}>
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com" required autoFocus
                      className="w-full h-[42px] rounded-[10px] text-[13px] font-medium outline-none transition-all pl-10 pr-3"
                      style={{
                        background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                        color: "var(--text-foreground)",
                      }}
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
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <Link href="/login"
                className="flex items-center justify-center gap-1.5 mt-5 text-[12px] font-semibold"
                style={{ color: "var(--text-muted)" }}>
                <ArrowLeft className="w-3 h-3" /> Back to login
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
