"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CreateWorkspacePage() {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create workspace"); setLoading(false); return; }

      // Refresh session so JWT gets the new organizationId
      await update({ organizationId: data.id, orgRole: "ADMIN" });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ margin: "0 auto 16px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, var(--accent), #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 8px 24px rgba(79,82,217,0.35)" }}>
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em" }}>C</span>
            </div>
            <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--text-subtle)" }}>A Zynotrix Product</p>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Create your workspace</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>
            This is your team&apos;s home on Colliq. Give it your company or team name.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Acme Inc."
              maxLength={60}
              required
              autoFocus
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
            />
            {name && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                URL: colliq.app/<strong>{name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</strong>
              </p>
            )}
          </div>

          {error && (
            <p style={{ fontSize: "0.85rem", color: "#F43F5E", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", padding: "10px 14px", borderRadius: 8 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{ padding: "12px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "0.95rem", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading || !name.trim() ? 0.6 : 1, marginTop: 4 }}
          >
            {loading ? "Creating…" : "Create workspace →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 24 }}>
          Your workspace is private — only people you invite can join.
        </p>
      </div>
    </div>
  );
}
