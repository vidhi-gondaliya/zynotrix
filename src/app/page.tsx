"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Zap, ArrowRight, Bot, Kanban, MessageSquare, Calendar,
  BarChart2, Shield, Sparkles, CheckCircle2, Users, Clock,
  ChevronDown, Star, Trophy, FileText,
} from "lucide-react";

// ── Animated canvas background ────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(157,107,255,0.4)";
        ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(157,107,255,${0.12 * (1 - d / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, accent }: {
  icon: React.ElementType; title: string; desc: string; accent: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl p-6 transition-all duration-300 cursor-default overflow-hidden"
      style={{
        background: hovered ? "rgba(157,107,255,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? "rgba(157,107,255,0.3)" : "rgba(255,255,255,0.06)"}`,
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 16px 48px rgba(157,107,255,0.12)" : "none",
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
        style={{ background: hovered ? accent : "rgba(255,255,255,0.05)" }}>
        <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-black text-white tracking-tight">{value}</p>
      <p className="text-[12px] font-medium mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
        style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
        {n}
      </div>
      <div className="pt-1">
        <h3 className="text-[15px] font-bold text-white mb-1">{title}</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Bot,          title: "Ask Colliq AI",        accent: "linear-gradient(135deg,#7C3AED,#A78BFA)", desc: "Chat with your workspace. Summarize projects, draft updates, and get instant answers — no tab-switching required." },
  { icon: Kanban, title: "Kanban Boards",         accent: "linear-gradient(135deg,#0EA5E9,#22D3EE)",  desc: "Drag-and-drop task management with custom columns, priority badges, and real-time position sync across your team." },
  { icon: MessageSquare,title: "Team Chat",             accent: "linear-gradient(135deg,#EC4899,#F43F5E)",  desc: "Threaded channels, direct messages, and file sharing — all in context with your work, not a separate app." },
  { icon: Calendar,     title: "Smart Meetings",        accent: "linear-gradient(135deg,#F59E0B,#FBBF24)",  desc: "Schedule meetings, auto-generate Google Meet links, and track attendance — with AI meeting summaries coming soon." },
  { icon: BarChart2,    title: "Workload Analytics",    accent: "linear-gradient(135deg,#10B981,#34D399)",  desc: "Visual burndown charts, sprint velocity, and capacity planning so no one burns out and nothing ships late." },
  { icon: Trophy,       title: "Rewards & Milestones",  accent: "linear-gradient(135deg,#F43F5E,#FB7185)",  desc: "Gamified XP, badges, and leaderboards keep your team motivated through even the longest sprints." },
  { icon: FileText,     title: "Living Documents",      accent: "linear-gradient(135deg,#8B5CF6,#C4B5FD)",  desc: "Collaborative docs that live next to your tasks. No more hunting through Notion, Confluence, or Google Drive." },
  { icon: Shield,       title: "Enterprise Security",   accent: "linear-gradient(135deg,#0F172A,#334155)",  desc: "Granular RBAC, full audit log, SSO-ready, and data encrypted at rest. SOC 2 compliance in progress." },
];

const TESTIMONIALS = [
  { quote: "We replaced Jira, Confluence, and Slack threads in one week. The AI alone saves us 5 hours of planning every sprint.", name: "Marcus T.", role: "Engineering Lead @ Pulse", color: "#818CF8" },
  { quote: "Colliq's project health scoring caught a timeline risk two weeks before our PM did. It literally saved our launch.", name: "Priya K.", role: "Head of Product @ Meridian", color: "#34D399" },
  { quote: "Onboarding our 40-person team took 2 hours. The invite flow is dead simple and the UI is honestly beautiful.", name: "Sophie R.", role: "CTO @ NovaSpark", color: "#F472B6" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ background: "#060610", color: "white", fontFamily: "var(--font-body, sans-serif)" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          padding: "0 5vw",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrolled ? "rgba(6,6,16,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[15px] font-black tracking-[-0.04em] text-white">COLLIQ</span>
            <span className="hidden sm:block text-[8px] font-bold tracking-widest uppercase ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>by Zynotrix</span>
          </div>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "How it works", "Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`}
              className="text-[13px] font-medium transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.5)" }}>{l}</a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="hidden sm:flex text-[13px] font-semibold transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            Sign in
          </Link>
          <Link href="/register"
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.6)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124,58,237,0.4)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
        <ParticleCanvas />

        {/* Orbs */}
        {[
          { left: "20%",  top: "25%",  size: "600px", color: "rgba(124,58,237,0.28)" },
          { left: "80%",  top: "60%",  size: "500px", color: "rgba(0,207,255,0.16)" },
          { left: "50%",  top: "10%",  size: "400px", color: "rgba(236,72,153,0.12)" },
        ].map((o, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{ left: o.left, top: o.top, width: o.size, height: o.size, background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`, filter: "blur(80px)", transform: "translate(-50%,-50%)" }} />
        ))}

        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.015) 1px, transparent 1px)`, backgroundSize: "56px 56px" }} />

        <div className="relative z-10 max-w-4xl text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(157,107,255,0.1)", border: "1px solid rgba(157,107,255,0.25)", color: "rgba(157,107,255,0.9)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered work OS · Now in beta
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.03] tracking-[-0.04em]">
            Your team&apos;s<br />
            <span style={{
              background: "linear-gradient(135deg, #A78BFA 0%, #818CF8 30%, #22D3EE 60%, #34D399 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>smartest colleague.</span>
          </h1>

          <p className="text-[17px] leading-relaxed max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Colliq combines project management, team chat, AI assistance, and analytics
            into one beautiful workspace — so your team ships faster with less chaos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="flex items-center gap-2 h-12 px-7 rounded-2xl text-[14px] font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 8px 32px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 48px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; }}>
              Start free — no card needed <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 h-12 px-7 rounded-2xl text-[14px] font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}>
              Sign in to workspace
            </Link>
          </div>

          {/* Perks */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {["14-day free trial", "No credit card", "5-minute setup", "Cancel anytime"].map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#34D399" }} />
                <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 animate-bounce">
          <p className="text-[10px] font-bold uppercase tracking-widest">Scroll</p>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <Stat value="10k+"  label="Teams worldwide" />
          <Stat value="99.9%" label="Uptime SLA" />
          <Stat value="4.9★"  label="Average rating" />
          <Stat value="3x"    label="Faster shipping" />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(157,107,255,0.8)" }}>Everything in one place</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Built for how teams<br />actually work</h2>
            <p className="text-[15px] max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Eight tools that usually live in eight different apps — unified under one AI-powered roof.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(157,107,255,0.8)" }}>Simple setup</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Up and running<br />in 5 minutes</h2>
          </div>
          <div className="space-y-10 max-w-lg mx-auto">
            <Step n="1" title="Create your workspace" desc="Sign up, name your workspace, and you're in. No complex setup, no SSO config, no admin portal." />
            <Step n="2" title="Invite your team" desc="Send email invitations with a role in one click. New members join your org instantly with the right permissions." />
            <Step n="3" title="Start working smarter" desc="Create your first project, open a task, and ask Colliq AI to plan your sprint. It reads your context and builds the plan for you." />
          </div>
          <div className="mt-12 text-center">
            <Link href="/register"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl text-[14px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
              Get your workspace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(157,107,255,0.8)" }}>Social proof</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Teams that switched<br />haven&apos;t looked back</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl p-6 space-y-4"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "#FBBF24" }} />
                  ))}
                </div>
                <p className="text-[13px] leading-relaxed italic" style={{ color: "rgba(255,255,255,0.6)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white">{t.name}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(157,107,255,0.8)" }}>Pricing</p>
            <h2 className="text-4xl font-black tracking-[-0.03em]">Simple, transparent pricing</h2>
            <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.4)" }}>Start free. Upgrade when your team grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-2xl p-8 space-y-6"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">$0</span>
                  <span className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>/month</span>
                </div>
                <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>For individuals and small teams getting started.</p>
              </div>
              <ul className="space-y-3">
                {["Unlimited projects & tasks", "Up to 5 team members", "Kanban + list views", "Team chat", "Basic AI features", "5 GB storage"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#34D399" }} />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className="block w-full h-11 rounded-xl text-[13px] font-bold text-center leading-[44px] transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}>
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-8 space-y-6 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(157,107,255,0.08))", border: "1px solid rgba(157,107,255,0.3)", boxShadow: "0 0 60px rgba(124,58,237,0.15)" }}>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", color: "white" }}>
                Popular
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(157,107,255,0.8)" }}>Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">$12</span>
                  <span className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>/user/month</span>
                </div>
                <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Everything in Free, plus advanced features for scaling teams.</p>
              </div>
              <ul className="space-y-3">
                {["Unlimited team members", "Advanced AI (Colliq Reports, Health)", "Custom roles & permissions", "Audit log & compliance", "Automations & integrations", "Priority support", "Unlimited storage"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#A78BFA" }} />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className="block w-full h-11 rounded-xl text-[13px] font-bold text-center leading-[44px] text-white transition-all"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124,58,237,0.4)"; }}>
                Start Pro trial free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, rgba(124,58,237,0.8), transparent)" }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 40px rgba(124,58,237,0.6)" }}>
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.04em]">
            Ready to move<br />
            <span style={{
              background: "linear-gradient(135deg,#A78BFA 0%,#818CF8 50%,#22D3EE 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>faster together?</span>
          </h2>
          <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Join thousands of teams that replaced five tools with one.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2.5 h-14 px-9 rounded-2xl text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7C3AED,#9D6BFF)", boxShadow: "0 8px 40px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 56px rgba(124,58,237,0.65), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; }}>
            Create your free workspace <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>Takes less than 2 minutes</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }}>
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[13px] font-black tracking-[-0.04em] text-white">COLLIQ</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase ml-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>by Zynotrix</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {[
              { label: "Sign in", href: "/login" },
              { label: "Create account", href: "/register" },
              { label: "Dashboard", href: "/dashboard" },
            ].map(l => (
              <Link key={l.label} href={l.href}
                className="text-[12px] transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            © 2026 Zynotrix · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
