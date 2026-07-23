"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, ExternalLink, Copy,
  Zap, ChevronDown, ChevronUp, HardDrive, Cloud,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────
type IntegrationType =
  | "SLACK" | "GITHUB" | "GOOGLE_CALENDAR" | "EMAIL"
  | "WHATSAPP"
  | "STORAGE_S3" | "STORAGE_LOCAL" | "STORAGE_ONEDRIVE" | "STORAGE_GDRIVE";

interface SlackConfig        { webhookUrl: string; notifyOn: { taskDone: boolean; taskUrgent: boolean; taskAssigned: boolean; taskOverdue: boolean }; }
interface GitHubConfig       { repos: string[]; secret: string; }
interface GoogleCalConfig    { enabled: boolean; syncMeetings: boolean; }
interface EmailConfig        { address: string; }
interface WhatsAppConfig     { phoneNumber: string; accountSid: string; authToken: string; fromNumber: string; notifyOn: { taskDone: boolean; taskUrgent: boolean; taskAssigned: boolean; }; }
interface S3Config           { accessKeyId: string; secretAccessKey: string; bucket: string; region: string; endpoint?: string; }
interface LocalStorageConfig { uploadDir: string; maxFileMb: number; }
interface OneDriveConfig     { clientId: string; tenantId: string; enabled: boolean; }
interface GDriveConfig       { folderId: string; enabled: boolean; }

type AnyConfig = SlackConfig | GitHubConfig | GoogleCalConfig | EmailConfig | WhatsAppConfig | S3Config | LocalStorageConfig | OneDriveConfig | GDriveConfig;

interface Integration { id: string; type: IntegrationType; isActive: boolean; config: AnyConfig; }

// ── Catalogue ──────────────────────────────────────────────────────
interface IntegrationMeta {
  type: IntegrationType;
  name: string;
  description: string;
  color: string;
  icon: string;
  setupSteps: string[];
}

const SECTIONS: { label: string; items: IntegrationMeta[] }[] = [
  {
    label: "Communication",
    items: [
      {
        type: "SLACK",
        name: "Slack",
        description: "Get notified in Slack when tasks are completed, become urgent, or are assigned.",
        color: "#E01E5A",
        icon: "💬",
        setupSteps: [
          "Go to your Slack workspace → Apps → Incoming Webhooks",
          'Click "Add to Slack", choose a channel, copy the Webhook URL',
          "Paste the URL below and click Test to verify",
        ],
      },
      {
        type: "EMAIL",
        name: "Email → Task",
        description: "Forward any email to your unique address and it becomes a task automatically.",
        color: "#06B6D4",
        icon: "📧",
        setupSteps: [
          "Copy your personal task email address below",
          "Forward emails to it — subject becomes the task title, body becomes description",
          "Set up Gmail / Outlook forwarding rules for hands-free automation",
        ],
      },
      {
        type: "WHATSAPP",
        name: "WhatsApp",
        description: "Receive task notifications and updates via WhatsApp using the Twilio API.",
        color: "#25D366",
        icon: "📱",
        setupSteps: [
          "Create a Twilio account at twilio.com and enable WhatsApp Sandbox",
          "Copy your Account SID and Auth Token from the Twilio Console",
          "Enter your WhatsApp number (with country code, e.g. +1234567890)",
          "Enter the Twilio WhatsApp sender number (e.g. +14155238886)",
          "Save and send a test message to verify",
        ],
      },
    ],
  },
  {
    label: "Developer",
    items: [
      {
        type: "GITHUB",
        name: "GitHub",
        description: "Auto-close tasks when PRs merge. Reference ZYN-<taskId> in PR descriptions.",
        color: "#24292F",
        icon: "🐙",
        setupSteps: [
          "Copy your Webhook URL below",
          "In GitHub repo → Settings → Webhooks → Add webhook",
          "Paste the URL, set content type application/json, select Pull request events",
          "Optionally set a Webhook Secret and paste it below for security",
        ],
      },
    ],
  },
  {
    label: "Calendar",
    items: [
      {
        type: "GOOGLE_CALENDAR",
        name: "Google Calendar",
        description: "Push Colliq meetings to your Google Calendar with one click.",
        color: "#4285F4",
        icon: "📅",
        setupSteps: [
          "Sign in with Google (Settings → Account) to grant Calendar access",
          'Enable the integration below, then use "Sync to Calendar" on any meeting',
        ],
      },
    ],
  },
  {
    label: "Storage",
    items: [
      {
        type: "STORAGE_S3",
        name: "AWS S3",
        description: "Store all file attachments in your own S3 bucket (or any S3-compatible storage).",
        color: "#FF9900",
        icon: "🪣",
        setupSteps: [
          "Create an S3 bucket in your AWS Console and note the region",
          "Create an IAM user with s3:PutObject / s3:GetObject / s3:DeleteObject permissions",
          "Copy the Access Key ID and Secret Access Key",
          "Paste all values below — files will route to S3 from this point on",
        ],
      },
      {
        type: "STORAGE_LOCAL",
        name: "Local Storage",
        description: "Save uploaded files to a directory on the server running Colliq.",
        color: "#64748B",
        icon: "💾",
        setupSteps: [
          "Set the absolute path to an upload directory on the server",
          "Make sure the server process has read/write permission on that path",
          "Set a maximum file size limit in MB (0 = unlimited)",
        ],
      },
      {
        type: "STORAGE_ONEDRIVE",
        name: "OneDrive",
        description: "Store attachments in your Microsoft OneDrive via the Microsoft Graph API.",
        color: "#0078D4",
        icon: "☁️",
        setupSteps: [
          "Register an application in the Azure Portal (portal.azure.com) → App registrations",
          "Add Files.ReadWrite.All permission under Microsoft Graph",
          "Copy the Application (Client) ID and Directory (Tenant) ID",
          "Paste both values below and click Connect — you'll be redirected to Microsoft login",
        ],
      },
      {
        type: "STORAGE_GDRIVE",
        name: "Google Drive",
        description: "Store attachments directly in a Google Drive folder using your Google account.",
        color: "#0F9D58",
        icon: "📂",
        setupSteps: [
          "Sign in with Google (Settings → Account) so Colliq has Drive access",
          "Paste the Google Drive Folder ID from the folder's URL",
          "All new attachments will be uploaded to that folder",
        ],
      },
    ],
  },
];

// ── Page ───────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});
  const [saving, setSaving]             = useState<Record<string, boolean>>({});
  const [userId, setUserId]             = useState("");
  const [appUrl, setAppUrl]             = useState("http://localhost:3000");

  const load = useCallback(async () => {
    try {
      const [intRes, meRes] = await Promise.all([
        fetch("/api/integrations").then((r) => r.json()),
        fetch("/api/users/me").then((r) => r.json()),
      ]);
      setIntegrations(Array.isArray(intRes) ? intRes : []);
      setUserId(meRes.id ?? "");
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, [load]);

  const getIntegration = (type: IntegrationType) =>
    integrations.find((i) => i.type === type) ?? null;

  async function save(type: IntegrationType, config: object, isActive = true) {
    setSaving((p) => ({ ...p, [type]: true }));
    try {
      const res = await fetch("/api/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config, isActive }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setIntegrations((prev) => {
        const exists = prev.find((i) => i.type === type);
        return exists ? prev.map((i) => (i.type === type ? updated : i)) : [...prev, updated];
      });
      toast.success("Integration saved");
    } catch { toast.error("Failed to save"); }
    setSaving((p) => ({ ...p, [type]: false }));
  }

  async function remove(type: IntegrationType) {
    if (!confirm(`Remove ${type} integration?`)) return;
    await fetch("/api/integrations", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setIntegrations((p) => p.filter((i) => i.type !== type));
    toast.success("Removed");
  }

  const webhookBase  = `${appUrl}/api/webhooks`;
  const emailAddress = userId ? `tasks+${userId}@${new URL(appUrl).host}` : "sign in to see";

  const connectedCount = integrations.filter((i) => i.isActive).length;
  const totalCount     = SECTIONS.flatMap((s) => s.items).length;

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-foreground)" }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Connect Colliq to your existing tools for real-time sync and automation.
          </p>
        </div>
        <div
          className="shrink-0 px-4 py-2 rounded-2xl text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-[22px] font-black leading-none" style={{ color: "var(--accent)" }}>
            {connectedCount}
          </p>
          <p className="text-[10px] font-bold mt-0.5 uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
            of {totalCount} active
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
                  {section.label}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                  {section.items.filter((m) => getIntegration(m.type)?.isActive).length}/{section.items.length}
                </span>
              </div>

              <div className="space-y-3">
                {section.items.map((meta, i) => {
                  const integration = getIntegration(meta.type);
                  const isConnected = !!integration?.isActive;
                  const isOpen      = !!expanded[meta.type];

                  return (
                    <motion.div
                      key={meta.type}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        border: isConnected ? `1px solid ${meta.color}45` : "1px solid var(--border)",
                        boxShadow: isConnected ? `0 0 0 3px ${meta.color}06` : "none",
                      }}
                    >
                      {/* Card header */}
                      <button
                        className="w-full flex items-center gap-4 px-5 py-4 text-left"
                        style={{ background: "var(--bg-card)" }}
                        onClick={() => setExpanded((p) => ({ ...p, [meta.type]: !p[meta.type] }))}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: meta.color + "18", border: `1px solid ${meta.color}25` }}
                        >
                          {meta.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>
                              {meta.name}
                            </span>
                            {isConnected ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                                <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                                Not connected
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{meta.description}</p>
                        </div>

                        {isOpen
                          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
                          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />}
                      </button>

                      {/* Expanded config */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            className="overflow-hidden"
                            style={{ borderTop: "1px solid var(--border-subtle)" }}
                          >
                            <div className="px-5 py-5 space-y-5" style={{ background: "var(--bg-elevated)" }}>
                              {/* Setup steps */}
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>
                                  Setup
                                </p>
                                <ol className="space-y-2">
                                  {meta.setupSteps.map((step, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                      <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                                        style={{ background: meta.color + "20", color: meta.color }}
                                      >
                                        {idx + 1}
                                      </span>
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {/* Per-type form */}
                              {meta.type === "SLACK" && (
                                <SlackForm
                                  config={integration?.config as SlackConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("SLACK", cfg)}
                                  onRemove={isConnected ? () => remove("SLACK") : undefined}
                                />
                              )}
                              {meta.type === "EMAIL" && (
                                <EmailForm
                                  emailAddress={emailAddress} color={meta.color} isConnected={isConnected}
                                  onEnable={() => save("EMAIL", { address: emailAddress })}
                                  onRemove={isConnected ? () => remove("EMAIL") : undefined}
                                />
                              )}
                              {meta.type === "WHATSAPP" && (
                                <WhatsAppForm
                                  config={integration?.config as WhatsAppConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("WHATSAPP", cfg)}
                                  onRemove={isConnected ? () => remove("WHATSAPP") : undefined}
                                />
                              )}
                              {meta.type === "GITHUB" && (
                                <GitHubForm
                                  config={integration?.config as GitHubConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  webhookUrl={`${webhookBase}/github`}
                                  onSave={(cfg) => save("GITHUB", cfg)}
                                  onRemove={isConnected ? () => remove("GITHUB") : undefined}
                                />
                              )}
                              {meta.type === "GOOGLE_CALENDAR" && (
                                <GoogleCalForm
                                  config={integration?.config as GoogleCalConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("GOOGLE_CALENDAR", cfg)}
                                  onRemove={isConnected ? () => remove("GOOGLE_CALENDAR") : undefined}
                                />
                              )}
                              {meta.type === "STORAGE_S3" && (
                                <S3Form
                                  config={integration?.config as S3Config ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("STORAGE_S3", cfg)}
                                  onRemove={isConnected ? () => remove("STORAGE_S3") : undefined}
                                />
                              )}
                              {meta.type === "STORAGE_LOCAL" && (
                                <LocalStorageForm
                                  config={integration?.config as LocalStorageConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("STORAGE_LOCAL", cfg)}
                                  onRemove={isConnected ? () => remove("STORAGE_LOCAL") : undefined}
                                />
                              )}
                              {meta.type === "STORAGE_ONEDRIVE" && (
                                <OneDriveForm
                                  config={integration?.config as OneDriveConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("STORAGE_ONEDRIVE", cfg)}
                                  onRemove={isConnected ? () => remove("STORAGE_ONEDRIVE") : undefined}
                                />
                              )}
                              {meta.type === "STORAGE_GDRIVE" && (
                                <GDriveForm
                                  config={integration?.config as GDriveConfig ?? null}
                                  color={meta.color} saving={!!saving[meta.type]}
                                  onSave={(cfg) => save("STORAGE_GDRIVE", cfg)}
                                  onRemove={isConnected ? () => remove("STORAGE_GDRIVE") : undefined}
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared UI helpers ──────────────────────────────────────────────

function CopyBox({ label, value }: { label?: string; value: string }) {
  return (
    <div>
      {label && <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>{label}</p>}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono truncate px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
          {value}
        </code>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied!"); }}
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
          <Copy className="w-3.5 h-3.5" />
        </button>
        {value.startsWith("http") && (
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 rounded-xl px-3 text-sm font-medium focus:outline-none"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
    </div>
  );
}

function Checkbox({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer px-3 py-2.5 rounded-xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded mt-0.5 accent-violet-500" />
      <div>
        <p className="text-xs font-semibold" style={{ color: "var(--text-foreground)" }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </label>
  );
}

function ActionRow({ onSave, onRemove, saving, color, saveLabel = "Save & Connect" }: {
  onSave: () => void; onRemove?: () => void; saving: boolean; color: string; saveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
        style={{ background: color }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {saving ? "Saving…" : saveLabel}
      </button>
      {onRemove && (
        <button onClick={onRemove}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold transition-colors"
          style={{ color: "var(--danger)" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--danger-muted)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}>
          <XCircle className="w-4 h-4" /> Disconnect
        </button>
      )}
    </div>
  );
}

// ── Slack ──────────────────────────────────────────────────────────
function SlackForm({ config, color, saving, onSave, onRemove }: {
  config: SlackConfig | null; color: string; saving: boolean;
  onSave: (cfg: SlackConfig) => void; onRemove?: () => void;
}) {
  const [url,     setUrl]     = useState(config?.webhookUrl ?? "");
  const [events,  setEvents]  = useState(config?.notifyOn ?? { taskDone: true, taskUrgent: true, taskAssigned: true, taskOverdue: false });
  const [testing, setTesting] = useState(false);

  async function test() {
    if (!url) return toast.error("Enter webhook URL first");
    setTesting(true);
    const res = await fetch("/api/integrations/slack/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: url }),
    });
    setTesting(false);
    res.ok ? toast.success("Test message sent! ✅") : toast.error("Failed — verify the webhook URL");
  }

  return (
    <div className="space-y-4">
      <Field label="Incoming Webhook URL" value={url} onChange={setUrl}
        placeholder="https://hooks.slack.com/services/..." />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>Notify me when</p>
        <div className="grid grid-cols-2 gap-2">
          {([["taskDone","Task completed"],["taskUrgent","Marked Urgent"],["taskAssigned","Assigned to me"],["taskOverdue","Task overdue"]] as const).map(([key, label]) => (
            <Checkbox key={key} checked={events[key]} onChange={(v) => setEvents((p) => ({ ...p, [key]: v }))} label={label} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={test} disabled={testing || !url}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Test
        </button>
        <ActionRow onSave={() => onSave({ webhookUrl: url, notifyOn: events })} onRemove={onRemove} saving={saving} color={color} />
      </div>
    </div>
  );
}

// ── Email ──────────────────────────────────────────────────────────
function EmailForm({ emailAddress, color, isConnected, onEnable, onRemove }: {
  emailAddress: string; color: string; isConnected: boolean; onEnable: () => void; onRemove?: () => void;
}) {
  return (
    <div className="space-y-4">
      <CopyBox label="Your personal task email" value={emailAddress} />
      <div className="rounded-xl p-4 space-y-1.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-black" style={{ color: "var(--text-foreground)" }}>How it works</p>
        {["Forward any email to the address above","Subject → task title · Body → description","Task is created in your most recent project","Tag `email` added automatically"].map((t) => (
          <p key={t} className="text-xs" style={{ color: "var(--text-muted)" }}>• {t}</p>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {!isConnected && (
          <button onClick={onEnable} className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-bold text-white" style={{ background: color }}>
            <CheckCircle2 className="w-4 h-4" /> Enable
          </button>
        )}
        {isConnected && <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--success)" }}><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>}
        {onRemove && (
          <button onClick={onRemove} className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold transition-colors" style={{ color: "var(--danger)" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--danger-muted)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <XCircle className="w-4 h-4" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── WhatsApp ───────────────────────────────────────────────────────
function WhatsAppForm({ config, color, saving, onSave, onRemove }: {
  config: WhatsAppConfig | null; color: string; saving: boolean;
  onSave: (cfg: WhatsAppConfig) => void; onRemove?: () => void;
}) {
  const [phoneNumber,  setPhoneNumber]  = useState(config?.phoneNumber  ?? "");
  const [accountSid,   setAccountSid]   = useState(config?.accountSid   ?? "");
  const [authToken,    setAuthToken]    = useState(config?.authToken     ?? "");
  const [fromNumber,   setFromNumber]   = useState(config?.fromNumber    ?? "+14155238886");
  const [notifyOn,     setNotifyOn]     = useState(config?.notifyOn ?? { taskDone: true, taskUrgent: true, taskAssigned: true });
  const [testing, setTesting] = useState(false);

  async function test() {
    if (!phoneNumber || !accountSid || !authToken) return toast.error("Fill in all fields first");
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/whatsapp/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, accountSid, authToken, fromNumber }),
      });
      res.ok ? toast.success("Test WhatsApp message sent! 📱") : toast.error("Failed — verify your Twilio credentials");
    } catch { toast.error("Network error"); }
    setTesting(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Your WhatsApp Number" value={phoneNumber} onChange={setPhoneNumber} placeholder="+1234567890" />
        <Field label="Twilio From Number"   value={fromNumber}   onChange={setFromNumber}   placeholder="+14155238886" />
      </div>
      <Field label="Twilio Account SID" value={accountSid} onChange={setAccountSid} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
      <Field label="Twilio Auth Token"  value={authToken}  onChange={setAuthToken}  placeholder="your_auth_token" type="password" />

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>Notify me when</p>
        <div className="grid grid-cols-3 gap-2">
          {([["taskDone","Task done"],["taskUrgent","Marked urgent"],["taskAssigned","Assigned to me"]] as const).map(([key, label]) => (
            <Checkbox key={key} checked={notifyOn[key]} onChange={(v) => setNotifyOn((p) => ({ ...p, [key]: v }))} label={label} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={test} disabled={testing}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Test
        </button>
        <ActionRow
          onSave={() => onSave({ phoneNumber, accountSid, authToken, fromNumber, notifyOn })}
          onRemove={onRemove} saving={saving} color={color} />
      </div>
    </div>
  );
}

// ── GitHub ─────────────────────────────────────────────────────────
function GitHubForm({ config, color, saving, webhookUrl, onSave, onRemove }: {
  config: GitHubConfig | null; color: string; saving: boolean; webhookUrl: string;
  onSave: (cfg: GitHubConfig) => void; onRemove?: () => void;
}) {
  const [repos,  setRepos]  = useState((config?.repos ?? []).join(", "));
  const [secret, setSecret] = useState(config?.secret ?? "");

  return (
    <div className="space-y-4">
      <CopyBox label="Your webhook URL — paste this in GitHub" value={webhookUrl} />
      <Field label="Tracked Repos (comma-separated)" value={repos} onChange={setRepos} placeholder="owner/repo, owner/repo2" />
      <Field label="Webhook Secret (optional)" value={secret} onChange={setSecret} placeholder="random secret matching GitHub setting" type="password" />
      <div className="rounded-xl p-3 text-xs" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        In your PR title or body write{" "}
        <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-elevated)", color: "var(--accent)" }}>ZYN-{"<taskId>"}</code>
        {" "}to link a PR. When merged, the task moves to <strong>DONE</strong> automatically.
      </div>
      <ActionRow onSave={() => onSave({ repos: repos.split(",").map((r) => r.trim()).filter(Boolean), secret })} onRemove={onRemove} saving={saving} color={color} />
    </div>
  );
}

// ── Google Calendar ────────────────────────────────────────────────
function GoogleCalForm({ config, color, saving, onSave, onRemove }: {
  config: GoogleCalConfig | null; color: string; saving: boolean;
  onSave: (cfg: GoogleCalConfig) => void; onRemove?: () => void;
}) {
  const [syncMeetings, setSyncMeetings] = useState(config?.syncMeetings ?? true);
  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Requires signing in with Google. Once your Google account is connected via NextAuth, your access token is used automatically.
      </p>
      <Checkbox checked={syncMeetings} onChange={setSyncMeetings}
        label="Sync meetings to Google Calendar"
        sub='Use "Sync to Calendar" on any meeting to push it with attendees.' />
      <ActionRow onSave={() => onSave({ enabled: true, syncMeetings })} onRemove={onRemove} saving={saving} color={color} />
    </div>
  );
}

// ── AWS S3 ─────────────────────────────────────────────────────────
function S3Form({ config, color, saving, onSave, onRemove }: {
  config: S3Config | null; color: string; saving: boolean;
  onSave: (cfg: S3Config) => void; onRemove?: () => void;
}) {
  const [accessKeyId,     setAccessKeyId]     = useState(config?.accessKeyId     ?? "");
  const [secretAccessKey, setSecretAccessKey] = useState(config?.secretAccessKey ?? "");
  const [bucket,          setBucket]          = useState(config?.bucket          ?? "");
  const [region,          setRegion]          = useState(config?.region          ?? "us-east-1");
  const [endpoint,        setEndpoint]        = useState(config?.endpoint        ?? "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Access Key ID"     value={accessKeyId}     onChange={setAccessKeyId}     placeholder="AKIAIOSFODNN7EXAMPLE" />
        <Field label="Secret Access Key" value={secretAccessKey} onChange={setSecretAccessKey} placeholder="wJalrXUtnFEMI/K7MDENG" type="password" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Bucket Name" value={bucket} onChange={setBucket} placeholder="my-zynotrix-files" />
        <Field label="Region"      value={region} onChange={setRegion}  placeholder="us-east-1" />
      </div>
      <Field label="Custom Endpoint (optional — for Cloudflare R2, MinIO, etc.)" value={endpoint} onChange={setEndpoint}
        placeholder="https://xxxx.r2.cloudflarestorage.com" />
      <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: `${color}10`, border: `1px solid ${color}25`, color: "var(--text-muted)" }}>
        <Cloud className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        All new file uploads will be stored in S3. Existing attachments are not migrated automatically.
      </div>
      <ActionRow onSave={() => onSave({ accessKeyId, secretAccessKey, bucket, region, endpoint: endpoint || undefined })} onRemove={onRemove} saving={saving} color={color} />
    </div>
  );
}

// ── Local Storage ──────────────────────────────────────────────────
function LocalStorageForm({ config, color, saving, onSave, onRemove }: {
  config: LocalStorageConfig | null; color: string; saving: boolean;
  onSave: (cfg: LocalStorageConfig) => void; onRemove?: () => void;
}) {
  const [uploadDir,  setUploadDir]  = useState(config?.uploadDir  ?? "/var/zynotrix/uploads");
  const [maxFileMb,  setMaxFileMb]  = useState(String(config?.maxFileMb ?? 50));

  return (
    <div className="space-y-4">
      <Field label="Upload Directory (absolute path on server)" value={uploadDir} onChange={setUploadDir} placeholder="/var/zynotrix/uploads" />
      <Field label="Max File Size (MB, 0 = unlimited)" value={maxFileMb} onChange={setMaxFileMb} placeholder="50" type="number" />
      <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: `${color}10`, border: `1px solid ${color}25`, color: "var(--text-muted)" }}>
        <HardDrive className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        The server process must have read/write access to the specified directory. Use absolute paths only.
      </div>
      <ActionRow onSave={() => onSave({ uploadDir, maxFileMb: parseInt(maxFileMb) || 0 })} onRemove={onRemove} saving={saving} color={color} />
    </div>
  );
}

// ── OneDrive ───────────────────────────────────────────────────────
function OneDriveForm({ config, color, saving, onSave, onRemove }: {
  config: OneDriveConfig | null; color: string; saving: boolean;
  onSave: (cfg: OneDriveConfig) => void; onRemove?: () => void;
}) {
  const [clientId, setClientId] = useState(config?.clientId  ?? "");
  const [tenantId, setTenantId] = useState(config?.tenantId  ?? "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Application (Client) ID" value={clientId} onChange={setClientId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        <Field label="Directory (Tenant) ID"   value={tenantId} onChange={setTenantId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </div>
      <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        <p className="font-semibold" style={{ color: "var(--text-foreground)" }}>Required Azure App Permissions</p>
        <p>• Microsoft Graph → <code className="px-1 rounded" style={{ background: "var(--bg-elevated)" }}>Files.ReadWrite.All</code></p>
        <p>• Redirect URI must include <code className="px-1 rounded" style={{ background: "var(--bg-elevated)" }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback/azure-ad</code></p>
      </div>
      <ActionRow onSave={() => onSave({ clientId, tenantId, enabled: true })} onRemove={onRemove} saving={saving} color={color} saveLabel="Save & Authorize" />
    </div>
  );
}

// ── Google Drive ───────────────────────────────────────────────────
function GDriveForm({ config, color, saving, onSave, onRemove }: {
  config: GDriveConfig | null; color: string; saving: boolean;
  onSave: (cfg: GDriveConfig) => void; onRemove?: () => void;
}) {
  const [folderId, setFolderId] = useState(config?.folderId ?? "");

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Sign in with Google (Settings → Account) so Colliq has Drive access. Then paste the folder ID from your Drive folder URL.
      </p>
      <Field label="Google Drive Folder ID" value={folderId} onChange={setFolderId}
        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
      <div className="p-3 rounded-xl text-xs" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        Find the folder ID in the URL: drive.google.com/drive/folders/<strong style={{ color: "var(--accent)" }}>THIS_PART</strong>
      </div>
      <ActionRow onSave={() => onSave({ folderId, enabled: true })} onRemove={onRemove} saving={saving} color={color} />
    </div>
  );
}
