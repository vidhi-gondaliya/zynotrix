"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/store/useTheme";
import {
  Sun, Moon, Key, User, Bell, Monitor, Mail, MessageCircle,
  Check, Loader2, Sparkles, Clock, Filter, Zap, BellOff, Volume2, Map,
} from "lucide-react";
import { useTour } from "@/store/useTour";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/api-error";

interface NotifPrefs {
  browser: boolean; email: boolean; whatsapp: boolean;
  whatsappPhone: string | null; emailAddress: string | null;
  taskAssigned: boolean; taskDue: boolean; taskOverdue: boolean;
  meetingInvite: boolean; projectUpdate: boolean;
  smartFilter: boolean; minPriority: string;
  dndEnabled: boolean; dndStart: string; dndEnd: string;
  digestMode: boolean;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none disabled:opacity-40"
      style={{ background: checked ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }} />
    </button>
  );
}

const PRIORITY_LEVELS = [
  { value: "LOW",    label: "Low",    color: "#6B7280", desc: "All notifications" },
  { value: "MEDIUM", label: "Medium", color: "#60A5FA", desc: "Skip low-priority" },
  { value: "HIGH",   label: "High",   color: "#FFC107", desc: "Important only" },
  { value: "URGENT", label: "Urgent", color: "#FF4466", desc: "Critical only" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { start: startTour } = useTour();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((d) => setPrefs(d));
  }, []);

  const update = <K extends keyof NotifPrefs>(field: K, value: NotifPrefs[K]) => {
    setPrefs((p) => p ? { ...p, [field]: value } : p);
    setDirty(true);
  };

  const save = async () => {
    if (!prefs || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) { toast.success("Preferences saved"); setDirty(false); }
      else toast.error(await getApiError(res, "Failed to save preferences"));
    } catch { toast.error("Couldn't reach the server — check your connection"); }
    setSaving(false);
  };

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications not supported"); return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      update("browser", true);
      new Notification("Colliq", { body: "Browser notifications enabled!" });
      toast.success("Browser notifications enabled!");
    } else {
      toast.error("Permission denied — check browser settings");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* Sticky save bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="sticky top-4 z-10 flex items-center justify-between px-5 py-3 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", boxShadow: "0 8px 32px rgba(157,107,255,0.25)" }}>
            <p className="text-sm font-semibold text-foreground">You have unsaved changes</p>
            <div className="flex gap-2">
              <button onClick={() => { setDirty(false); fetch("/api/notifications/preferences").then((r) => r.json()).then(setPrefs); }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
                Discard
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                style={{ background: "var(--accent)" }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-accent" /> Profile
        </h3>
        <div className="flex items-center gap-4">
          <Avatar name={session?.user?.name} image={session?.user?.image} size="lg" />
          <div className="flex-1">
            <p className="font-bold text-foreground">{session?.user?.name ?? "User"}</p>
            <p className="text-sm text-muted">{session?.user?.email}</p>
            <p className="text-xs text-subtle mt-0.5 capitalize">{(session?.user as { role?: string })?.role?.toLowerCase() ?? "member"}</p>
          </div>
          <button
            onClick={startTour}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-glow)",
              color: "var(--accent)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-muted)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
          >
            <Map className="w-3.5 h-3.5" />
            Show Tour
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          {theme === "dark" ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-accent" />}
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Theme</p>
            <p className="text-xs text-muted">Currently {theme} mode</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Integrations */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" /> Integrations
        </h3>
        <div className="space-y-2">
          {[
            { name: "Claude AI", desc: "AI Assistant, Reports & Health Analysis", status: "Connected", color: "#9D6BFF" },
            { name: "Google Meet", desc: "Auto-create Meet links for meetings", status: "Optional", color: "#FFC107" },
          ].map((int) => (
            <div key={int.name} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)" }}>
              <div>
                <p className="text-sm font-semibold text-foreground">{int.name}</p>
                <p className="text-xs text-muted">{int.desc}</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${int.color}15`, color: int.color }}>
                {int.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notification Control ─────────────────────────────────────── */}
      {!prefs ? (
        <div className="rounded-2xl p-8 flex justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <Loader2 className="w-5 h-5 animate-spin text-subtle" />
        </div>
      ) : (
        <>
          {/* Delivery Channels */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" /> Notification Channels
            </h3>

            {/* Browser */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(157,107,255,0.15)" }}>
                    <Monitor className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Browser Push</p>
                    <p className="text-xs text-subtle">Real-time alerts in this browser</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!prefs.browser && (
                    <button onClick={requestBrowserPermission} className="text-[10px] font-bold text-accent hover:underline">Enable</button>
                  )}
                  <Toggle checked={prefs.browser} onChange={(v) => update("browser", v)} />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(96,165,250,0.15)" }}>
                    <Mail className="w-4 h-4" style={{ color: "#60A5FA" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email</p>
                    <p className="text-xs text-subtle">Receive updates via email</p>
                  </div>
                </div>
                <Toggle checked={prefs.email} onChange={(v) => update("email", v)} />
              </div>
              <AnimatePresence>
                {prefs.email && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3.5 pb-3.5">
                      <input value={prefs.emailAddress ?? ""} onChange={(e) => update("emailAddress", e.target.value)}
                        placeholder={session?.user?.email ?? "your@email.com"}
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* WhatsApp */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.15)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "#34D399" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                    <p className="text-xs text-subtle">Via Twilio Business API</p>
                  </div>
                </div>
                <Toggle checked={prefs.whatsapp} onChange={(v) => update("whatsapp", v)} />
              </div>
              <AnimatePresence>
                {prefs.whatsapp && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3.5 pb-3.5 space-y-1.5">
                      <input value={prefs.whatsappPhone ?? ""} onChange={(e) => update("whatsappPhone", e.target.value)}
                        placeholder="+1234567890 (include country code)"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                      <p className="text-[10px] text-subtle">Requires Twilio WhatsApp Business API configuration in .env</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Event Toggles */}
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" /> Notify Me When
            </h3>
            <div className="space-y-0.5">
              {[
                { key: "taskAssigned" as keyof NotifPrefs,  icon: "📋", label: "Task assigned to me",    desc: "Someone assigns you a task" },
                { key: "taskDue"      as keyof NotifPrefs,  icon: "⏰", label: "Task due soon",          desc: "24h before due date" },
                { key: "taskOverdue"  as keyof NotifPrefs,  icon: "🚨", label: "Task becomes overdue",   desc: "Past due date without completion" },
                { key: "meetingInvite" as keyof NotifPrefs, icon: "📅", label: "Meeting invitation",     desc: "Added to a new meeting" },
                { key: "projectUpdate" as keyof NotifPrefs, icon: "📊", label: "Project health changes", desc: "Health score drops significantly" },
              ].map(({ key, icon, label, desc }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-elevated transition-colors group">
                  <span className="text-base shrink-0">{icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-subtle">{desc}</p>
                  </div>
                  <Toggle checked={prefs[key] as boolean} onChange={(v) => update(key, v)} />
                </label>
              ))}
            </div>
          </div>

          {/* Smart Filtering */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#9D6BFF" }} />
                Smart Filtering
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(157,107,255,0.15)", color: "#9D6BFF" }}>AI</span>
              </h3>
              <Toggle checked={prefs.smartFilter} onChange={(v) => update("smartFilter", v)} />
            </div>
            <p className="text-xs text-muted">AI-powered filtering silences low-value noise and only surfaces what actually needs your attention.</p>

            <AnimatePresence>
              {prefs.smartFilter && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden">
                  {/* Minimum priority */}
                  <div>
                    <p className="text-[11px] font-bold text-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Filter className="w-3 h-3" /> Minimum Priority Level
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {PRIORITY_LEVELS.map((p) => (
                        <button key={p.value} onClick={() => update("minPriority", p.value)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-all"
                          style={{
                            background: prefs.minPriority === p.value ? `${p.color}15` : "var(--bg-elevated)",
                            border: `1.5px solid ${prefs.minPriority === p.value ? p.color : "transparent"}`,
                          }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-[10px] font-bold" style={{ color: prefs.minPriority === p.value ? p.color : "var(--text-muted)" }}>
                            {p.label}
                          </span>
                          <span className="text-[9px] text-subtle leading-tight">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Digest mode */}
                  <label className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Digest Mode</p>
                        <p className="text-xs text-subtle">Batch low-priority alerts into hourly summaries</p>
                      </div>
                    </div>
                    <Toggle checked={prefs.digestMode} onChange={(v) => update("digestMode", v)} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Do Not Disturb */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BellOff className="w-4 h-4" style={{ color: "#60A5FA" }} /> Do Not Disturb
              </h3>
              <Toggle checked={prefs.dndEnabled} onChange={(v) => update("dndEnabled", v)} />
            </div>
            <p className="text-xs text-muted">Mute all non-critical notifications during set hours.</p>
            <AnimatePresence>
              {prefs.dndEnabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <Clock className="w-3 h-3" /> Start (mute from)
                      </label>
                      <input type="time" value={prefs.dndStart} onChange={(e) => update("dndStart", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none"
                        style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <Clock className="w-3 h-3" /> End (resume at)
                      </label>
                      <input type="time" value={prefs.dndEnd} onChange={(e) => update("dndEnd", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none"
                        style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-subtle mt-2">
                    URGENT notifications will always bypass DND.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Organization settings shortcut */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" /> Workspace
        </h3>
        <a href="/settings/organization"
          className="flex items-center justify-between px-4 py-3 rounded-xl transition-all group"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-muted)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}>
          <div>
            <p className="text-sm font-semibold text-foreground">Organization Settings</p>
            <p className="text-xs text-muted mt-0.5">Manage workspace name, members, and invitations</p>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>Manage →</span>
        </a>
      </div>

      {/* Product attribution */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
          Part of the <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Zynotrix</span> ecosystem &nbsp;·&nbsp; Colliq v1.0
        </p>
      </div>
    </div>
  );
}
