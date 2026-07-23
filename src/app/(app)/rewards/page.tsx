"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap, Gift, Users, TrendingUp, Clock, CheckCircle, Award, Lock, Flame, Crown } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Badge       { id: string; name: string; label: string; description: string; icon: string; earnedAt?: string; roleScope: string | null; }
interface Coupon      { id: string; code: string; label: string; description: string | null; pointCost: number; quantity: number | null; usedCount: number; expiresAt: string | null; isActive: boolean; }
interface Transaction { id: string; action: string; points: number; metadata: Record<string, unknown>; createdAt: string; }
interface LeaderEntry { userId: string; name: string; image: string | null; role: string; lifetime: number; balance: number; }
interface RewardsData {
  balance: number; lifetime: number;
  transactions: Transaction[]; badges: Badge[];
  availableCoupons: Coupon[];
  redemptions: { id: string; couponId: string; redeemedAt: string; coupon: { label: string; code: string } }[];
  leaderboard: Record<string, LeaderEntry[]>;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  task_complete: { label: "Task Completed",          color: "var(--success)", bg: "var(--success-muted)", icon: <CheckCircle className="w-4 h-4" /> },
  task_early:    { label: "Finished Early",          color: "var(--accent)",  bg: "var(--accent-muted)",  icon: <Zap className="w-4 h-4" /> },
  attendance:    { label: "Attendance Marked",       color: "var(--energy)",  bg: "var(--energy-muted)",  icon: <Clock className="w-4 h-4" /> },
  streak:        { label: "Activity Streak Bonus",   color: "var(--danger)",  bg: "var(--danger-muted)",  icon: <Flame className="w-4 h-4" /> },
};

const ROLE_PALETTE = ["#818CF8", "#22C55E", "#F43F5E", "#FBBF24", "#A78BFA", "#60A5FA", "#34D399", "#FB923C"];
const PRESET_ROLE_COLORS: Record<string, string> = {
  MEMBER: "#22C55E", MANAGER: "#818CF8", ADMIN: "#F43F5E", OWNER: "#FBBF24",
};

function getRoleColor(role: string, allRoles: string[]) {
  if (PRESET_ROLE_COLORS[role]) return PRESET_ROLE_COLORS[role];
  const idx = allRoles.indexOf(role);
  return ROLE_PALETTE[idx % ROLE_PALETTE.length];
}

const TABS = ["My Rewards", "Leaderboard", "Coupons"] as const;
type Tab = typeof TABS[number];

/* ── Animated counter ─────────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    let f = 0; const total = 60;
    const tick = () => {
      f++;
      setV(Math.round((1 - Math.pow(1 - f / total, 3)) * target));
      if (f < total) requestAnimationFrame(tick); else setV(target);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{v.toLocaleString()}{suffix}</>;
}

/* ── Stat card ────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, bg, glow, index }: {
  label: string; value: number; icon: React.ReactNode;
  color: string; bg: string; glow: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${glow}`,
        boxShadow: `var(--shadow-sm), 0 0 32px ${glow}`,
      }}
    >
      {/* Ambient blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: color, opacity: 0.12 }}
      />
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: bg, color, boxShadow: `0 4px 16px ${glow}` }}
        >
          {icon}
        </div>
        <p
          className="text-[28px] font-black leading-none tabular mb-1"
          style={{ color }}
        >
          <Counter target={value} />
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export default function RewardsPage() {
  const { data: session } = useSession();
  const [tab, setTab]       = useState<Tab>("My Rewards");
  const [data, setData]     = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [lbRole, setLbRole] = useState<string>("MEMBER");

  useEffect(() => {
    fetch("/api/rewards")
      .then((r) => r.json())
      .then((d: RewardsData) => {
        setData(d);
        const roles = Object.keys(d.leaderboard ?? {});
        if (roles.length > 0 && !roles.includes(lbRole)) setLbRole(roles[0]);
        setLoading(false);
      })
      .catch((err) => { console.error("[rewards] load data", err); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redeem(couponId: string) {
    setRedeeming(couponId);
    const res  = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponId }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success(json.message);
      const fresh = await fetch("/api/rewards").then((r) => r.json());
      setData(fresh);
    } else {
      toast.error(json.error);
    }
    setRedeeming(null);
  }

  if (loading) return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="h-36 skeleton rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
      </div>
      <div className="h-48 skeleton rounded-2xl" />
    </div>
  );

  if (!data) return null;

  const userRole  = (session?.user as { role?: string })?.role ?? "MEMBER";
  const allLbRoles = Object.keys(data.leaderboard ?? {});
  const roleColor  = getRoleColor(userRole, allLbRoles);

  const ROLE_ICONS: Record<string, string> = {
    MEMBER: "👤", MANAGER: "👔", ADMIN: "🛡️", OWNER: "👑",
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Hero: balance + user rank ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Background mesh */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 70% 40%, var(--energy-glow) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, var(--accent-glow) 0%, transparent 45%)",
        }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: "linear-gradient(90deg, transparent, var(--energy) 35%, var(--accent) 65%, transparent)",
        }} />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Role avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: `${roleColor}18`, border: `1.5px solid ${roleColor}40`, boxShadow: `0 0 24px ${roleColor}25` }}
            >
              {ROLE_ICONS[userRole] ?? "⭐"}
            </div>
            <div>
              <p className="label-caps mb-1" style={{ color: "var(--text-subtle)" }}>Your Rank</p>
              <h2
                className="text-[22px] font-black leading-none"
                style={{ color: roleColor, letterSpacing: "-0.03em" }}
              >
                {userRole}
              </h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
                {session?.user?.name ?? ""}
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <p className="label-caps mb-1" style={{ color: "var(--text-subtle)" }}>Current Balance</p>
            <p
              className="text-[40px] font-black leading-none tabular"
              style={{
                background: "linear-gradient(135deg, var(--energy) 0%, #FB923C 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              <Counter target={data.balance} />
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
              <Counter target={data.lifetime} /> lifetime pts
            </p>
          </div>
        </div>

        {/* Earned badges strip */}
        {data.badges.length > 0 && (
          <div className="relative z-10 flex gap-2 flex-wrap mt-5 pt-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {data.badges.map((b) => (
              <motion.div
                key={b.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                title={b.description}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  background: "var(--accent-muted)",
                  border: "1px solid var(--accent-glow)",
                  color: "var(--accent)",
                }}
              >
                <span className="text-sm">{b.icon}</span>
                {b.label}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} label="Balance"   value={data.balance}           icon={<Zap className="w-5 h-5" />}       color="#FBBF24" bg="rgba(251,191,36,0.12)" glow="rgba(251,191,36,0.18)" />
        <StatCard index={1} label="Lifetime"  value={data.lifetime}          icon={<TrendingUp className="w-5 h-5" />} color="var(--accent)" bg="var(--accent-muted)" glow="var(--accent-glow)" />
        <StatCard index={2} label="Badges"    value={data.badges.length}     icon={<Award className="w-5 h-5" />}     color="#F43F5E" bg="var(--danger-muted)"  glow="var(--danger-muted)" />
        <StatCard index={3} label="Redeemed"  value={data.redemptions.length} icon={<Gift className="w-5 h-5" />}    color="var(--success)" bg="var(--success-muted)" glow="var(--success-muted)" />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent-foreground)" : "var(--text-muted)",
              boxShadow: tab === t ? "var(--shadow-glow-btn)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── MY REWARDS ─────────────────────────────────────────── */}
        {tab === "My Rewards" && (
          <motion.div key="my" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Badges grid */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4" style={{ color: "var(--energy)" }} />
                <h3 className="heading-md">All Badges</h3>
              </div>

              {data.badges.length === 0 ? (
                <div
                  className="rounded-2xl p-8 flex flex-col items-center text-center"
                  style={{ background: "var(--bg-card)", border: "1.5px dashed var(--border-strong)" }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--bg-elevated)" }}>
                    <Lock className="w-6 h-6" style={{ color: "var(--text-subtle)" }} />
                  </div>
                  <p className="text-[14px] font-bold mb-1" style={{ color: "var(--text-foreground)" }}>No badges yet</p>
                  <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>Complete tasks and mark attendance to earn your first badge.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.badges.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative overflow-hidden rounded-[14px] p-4 flex items-start gap-3"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: "linear-gradient(90deg, var(--energy), var(--accent))" }} />
                      <span className="text-[32px] leading-none shrink-0">{b.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>{b.label}</p>
                        <p className="text-[11.5px] leading-relaxed mt-0.5" style={{ color: "var(--text-muted)" }}>{b.description}</p>
                        {b.earnedAt && (
                          <p className="text-[10px] font-semibold mt-2" style={{ color: "var(--success)" }}>
                            ✓ Earned {format(new Date(b.earnedAt), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <h3 className="heading-md">Recent Activity</h3>
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                {data.transactions.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-foreground)" }}>No activity yet</p>
                    <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Complete tasks or clock in to start earning points!</p>
                  </div>
                ) : (
                  data.transactions.map((t, i) => {
                    const cfg = ACTION_LABELS[t.action] ?? { label: t.action, color: "var(--accent)", bg: "var(--accent-muted)", icon: <Star className="w-4 h-4" /> };
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                        style={{
                          borderBottom: i < data.transactions.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold" style={{ color: "var(--text-foreground)" }}>{cfg.label}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                            {format(new Date(t.createdAt), "MMM d · h:mm a")}
                          </p>
                        </div>
                        <span
                          className="text-[14px] font-black tabular"
                          style={{ color: cfg.color }}
                        >
                          +{t.points} pts
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LEADERBOARD ────────────────────────────────────────── */}
        {tab === "Leaderboard" && (
          <motion.div key="lb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Role filter */}
            {allLbRoles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allLbRoles.map((r) => {
                  const rc = getRoleColor(r, allLbRoles);
                  const active = lbRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setLbRole(r)}
                      className="px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all"
                      style={{
                        background: active ? `${rc}18` : "var(--bg-elevated)",
                        color: active ? rc : "var(--text-muted)",
                        border: `1.5px solid ${active ? rc + "50" : "var(--border)"}`,
                        boxShadow: active ? `0 0 16px ${rc}22` : "none",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            )}

            {allLbRoles.length === 0 && (
              <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-subtle)" }} />
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-foreground)" }}>No leaderboard data yet</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Earn points to appear on the leaderboard.</p>
              </div>
            )}

            {allLbRoles.length > 0 && (() => {
              const lbColor = getRoleColor(lbRole, allLbRoles);
              const entries  = (data.leaderboard[lbRole] ?? []).slice(0, 10);
              const medals   = ["🥇", "🥈", "🥉"];

              return (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}
                  >
                    <Crown className="w-4 h-4" style={{ color: lbColor }} />
                    <span className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>
                      {lbRole} Leaderboard
                    </span>
                    <span className="ml-auto text-[11px]" style={{ color: "var(--text-subtle)" }}>
                      {entries.length} member{entries.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {entries.length === 0 && (
                    <div className="p-10 text-center">
                      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                        No {lbRole}s have earned points yet.
                      </p>
                    </div>
                  )}

                  {entries.map((entry, i) => {
                    const isMe = entry.userId === session?.user?.id;
                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                        style={{
                          borderBottom: i < entries.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                          background: isMe ? `${lbColor}08` : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isMe ? `${lbColor}08` : "transparent"; }}
                      >
                        {/* Rank */}
                        <span
                          className="w-8 text-center text-[15px] font-black shrink-0"
                          style={{ color: i < 3 ? "var(--text-foreground)" : "var(--text-subtle)" }}
                        >
                          {i < 3 ? medals[i] : `#${i + 1}`}
                        </span>

                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-black shrink-0"
                          style={{ background: `${lbColor}20`, color: lbColor, border: isMe ? `1.5px solid ${lbColor}60` : "none" }}
                        >
                          {entry.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-foreground)" }}>
                            {entry.name}
                            {isMe && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${lbColor}18`, color: lbColor }}>You</span>}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                            {entry.lifetime.toLocaleString()} lifetime pts
                          </p>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-black tabular" style={{ color: lbColor }}>
                            {entry.balance.toLocaleString()}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>pts</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ── COUPONS ────────────────────────────────────────────── */}
        {tab === "Coupons" && (
          <motion.div key="coupons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Balance reminder */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-[14px]"
              style={{ background: "var(--energy-muted)", border: "1px solid var(--energy-glow)" }}
            >
              <Zap className="w-4 h-4 shrink-0" style={{ color: "var(--energy)" }} />
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-foreground)" }}>
                You have <span style={{ color: "var(--energy)", fontWeight: 800 }}>{data.balance.toLocaleString()} pts</span> available to spend
              </p>
            </div>

            {/* Coupon grid */}
            {data.availableCoupons.length === 0 ? (
              <div
                className="rounded-2xl p-12 flex flex-col items-center text-center"
                style={{ background: "var(--bg-card)", border: "1.5px dashed var(--border-strong)" }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--bg-elevated)" }}>
                  <Gift className="w-6 h-6" style={{ color: "var(--text-subtle)" }} />
                </div>
                <p className="text-[14px] font-bold mb-1" style={{ color: "var(--text-foreground)" }}>No coupons yet</p>
                <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>Admins will add new coupons here. Keep earning!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.availableCoupons.map((c, i) => {
                  const canAfford  = data.balance >= c.pointCost;
                  const isRedeeming = redeeming === c.id;
                  const stockLeft  = c.quantity !== null ? c.quantity - c.usedCount : null;

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="relative overflow-hidden rounded-[16px] p-5 flex flex-col gap-4"
                      style={{
                        background: "var(--bg-card)",
                        border: `1px solid ${canAfford ? "var(--border-strong)" : "var(--border)"}`,
                        boxShadow: canAfford ? "var(--shadow-md)" : "var(--shadow-xs)",
                        opacity: canAfford ? 1 : 0.6,
                      }}
                    >
                      {/* Top glow */}
                      {canAfford && (
                        <div className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: "linear-gradient(90deg, var(--accent), var(--energy))" }} />
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-black" style={{ color: "var(--text-foreground)" }}>{c.label}</p>
                          {c.description && (
                            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.description}</p>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0"
                          style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}
                        >
                          {c.code}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-subtle)" }}>
                          {c.expiresAt && <span>Expires {format(new Date(c.expiresAt), "MMM d")}</span>}
                          {stockLeft !== null && (
                            <span
                              className="font-semibold"
                              style={{ color: stockLeft < 5 ? "var(--warning)" : "var(--text-muted)" }}
                            >
                              {stockLeft} left
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => redeem(c.id)}
                          disabled={!canAfford || !!isRedeeming}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: canAfford ? "var(--accent)" : "var(--bg-elevated)",
                            color: canAfford ? "var(--accent-foreground)" : "var(--text-muted)",
                            boxShadow: canAfford ? "var(--shadow-glow-btn)" : "none",
                          }}
                        >
                          {isRedeeming ? (
                            <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <Gift className="w-3.5 h-3.5" />
                          )}
                          {isRedeeming ? "Redeeming…" : c.pointCost === 0 ? "Claim Free" : `${c.pointCost.toLocaleString()} pts`}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Redemption history */}
            {data.redemptions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4" style={{ color: "var(--success)" }} />
                  <h3 className="heading-md">Redeemed</h3>
                </div>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  {data.redemptions.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-5 py-3.5"
                      style={{ borderBottom: i < data.redemptions.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
                    >
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text-foreground)" }}>{r.coupon.label}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{format(new Date(r.redeemedAt), "MMM d, yyyy")}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--success-muted)", color: "var(--success)" }}
                      >
                        {r.coupon.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
