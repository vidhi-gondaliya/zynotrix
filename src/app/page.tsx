"use client";

import "./marketing.css";
import type React from "react";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Asterisk, Check, ChevronDown,
  CircleCheck, Clock3, Command, Eye, FolderKanban, Layers3, Menu, MessageCircle,
  MoveUpRight, Plus, Sparkles, Users, X, Zap, CalendarDays, Activity,
  CircleAlert, LayoutGrid, ListChecks, ChartNoAxesCombined
} from "lucide-react";

type WorkView = "Board" | "List" | "Timeline" | "Sprint";
type Audience = "Agencies" | "Software teams" | "Growing teams";

const ease = [0.22, 1, 0.36, 1] as const;

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={"mk-mark" + (inverse ? " mk-mark-inverse" : "")} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

function LinkArrow({ children, href, primary = false }: { children: React.ReactNode; href: string; primary?: boolean }) {
  return (
    <Link href={href} className={"mk-link-arrow" + (primary ? " is-primary" : "")}>
      <span>{children}</span><ArrowUpRight size={17} strokeWidth={1.8} />
    </Link>
  );
}

function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={"mk-kicker" + (light ? " is-light" : "")}><span />{children}</p>;
}

function SectionTitle({ kicker, children, description, light = false }: {
  kicker: string; children: React.ReactNode; description?: string; light?: boolean;
}) {
  return (
    <div className={"mk-section-head" + (light ? " is-light" : "")}>
      <Kicker light={light}>{kicker}</Kicker>
      <h2>{children}</h2>
      {description && <p className="mk-section-description">{description}</p>}
    </div>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduce ? 0 : 0.68, delay: reduce ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function LivingCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const move = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.setProperty("--mx", (x * 16) + "px");
    ref.current.style.setProperty("--my", (y * 14) + "px");
  };
  const reset = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };
  return (
    <div className="mk-living-canvas" ref={ref} onMouseMove={move} onMouseLeave={reset}>
      <div className="mk-canvas-wash" />
      <svg className="mk-canvas-paths" viewBox="0 0 760 620" fill="none" aria-hidden="true">
        <path className="mk-signal-path mk-path-a" d="M71 146C182 46 268 159 372 171S538 106 682 64" />
        <path className="mk-signal-path mk-path-b" d="M116 470c94-148 223-14 319-118s118 24 226-52" />
        {!reduce && <>
          <circle className="mk-path-dot mk-dot-a" r="5" fill="currentColor" />
          <circle className="mk-path-dot mk-dot-b" r="4" fill="currentColor" />
        </>}
      </svg>
      <span className="mk-canvas-label mk-label-one">01 / THE BRIEF</span>
      <span className="mk-canvas-label mk-label-two">CONTEXT, KEPT</span>
      <motion.div className="mk-project-note mk-canvas-item" animate={reduce ? undefined : { y: [0, -5, 0], rotate: [-4, -3.2, -4] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}>
        <div className="mk-note-top"><span>Website launch</span><span className="mk-mini-status">IN MOTION</span></div>
        <h3>Make launch day<br />feel effortless.</h3>
        <div className="mk-note-meta"><span><Users size={14} /> 4 people</span><span>FRI 18</span></div>
      </motion.div>
      <motion.div className="mk-ai-note mk-canvas-item" animate={reduce ? undefined : { y: [0, 7, 0], rotate: [2, 1.2, 2] }} transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>
        <div className="mk-ai-orb"><BrandMark inverse /></div>
        <div><small>COLLIQ NOTICED</small><p>Client review overlaps the final QA window.</p><span className="mk-note-action">See the risk <ArrowRight size={13} /></span></div>
      </motion.div>
      <motion.div className="mk-task-slip mk-canvas-item" animate={reduce ? undefined : { y: [0, -6, 0], rotate: [3, 2.2, 3] }} transition={{ duration: 6.1, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
        <span className="mk-task-check"><Check size={13} /></span>
        <div><b>Confirm launch copy</b><small>From meeting notes · Jamie</small></div>
      </motion.div>
      <motion.div className="mk-client-slip mk-canvas-item" animate={reduce ? undefined : { y: [0, 5, 0], rotate: [-2, -1, -2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}>
        <div className="mk-client-ring"><b>78</b><span>%</span></div>
        <div><small>CLIENT VIEW</small><b>On track</b><span>Last update 12m ago</span></div>
      </motion.div>
      <div className="mk-canvas-stamp mk-canvas-item">ONE WORKSPACE<br /><b>LESS CHASING</b></div>
      <div className="mk-scribble-arrow" aria-hidden="true">↳</div>
    </div>
  );
}

const fragments = ["Task tracker", "Meeting notes", "Client email", "Team chat", "Status deck", "Time log"];
function Frustration() {
  return (
    <section className="mk-frustration mk-section-pad" id="why">
      <div className="mk-content-grid">
        <SectionTitle kicker="THE TAB PROBLEM" description="The task is in one place. The decision is in another. The client is asking in a third. Colliq is designed to hold the thread, so the work makes sense without a daily scavenger hunt.">
          Your team’s work is everywhere.<br /><em>The context shouldn’t be.</em>
        </SectionTitle>
      </div>
      <Reveal className="mk-fragment-field">
        <svg viewBox="0 0 1200 390" preserveAspectRatio="none" aria-hidden="true">
          <path d="M90 85C245 192 324 34 492 186s272 36 356 62 135-13 264-105" />
        </svg>
        {fragments.map((item, index) => (
          <motion.div className={"mk-fragment mk-fragment-" + (index + 1)} key={item} whileHover={{ rotate: 0, scale: 1.04 }} transition={{ duration: 0.25 }}>
            <span>0{index + 1}</span>{item}
          </motion.div>
        ))}
        <div className="mk-context-core"><BrandMark inverse /><span>COLLIQ</span><small>The thread stays intact.</small></div>
      </Reveal>
    </section>
  );
}

function BrandMoment() {
  return (
    <section className="mk-brand-moment mk-section-pad" id="platform">
      <Reveal className="mk-brand-word"><span>COLL</span><span>IQ</span></Reveal>
      <Reveal className="mk-brand-definition">
        <Kicker>COLLEAGUE + INTELLIGENCE</Kicker>
        <h2>Meet the colleague<br />who <em>connects the dots.</em></h2>
        <p>Not another layer to manage. A connected place where project work, team activity, client delivery, and contextual assistance can finally speak the same language.</p>
        <LinkArrow href="https://app.colliq.app/register" primary>Meet Colliq</LinkArrow>
      </Reveal>
    </section>
  );
}

const aiSteps = [
  { label: "Project", title: "Website launch", meta: "Goal understood" },
  { label: "Work", title: "12 structured tasks", meta: "Owners suggested" },
  { label: "Risk", title: "QA window is tight", meta: "Flagged for review" },
];

function AIDemo() {
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(3);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const runDemo = () => {
    if (playing) return;
    setPlaying(true);
    setVisible(0);
    timers.current.forEach(window.clearTimeout);
    timers.current = aiSteps.map((_, index) => window.setTimeout(() => setVisible(index + 1), 420 * (index + 1)));
    timers.current.push(window.setTimeout(() => setPlaying(false), 1800));
  };
  return (
    <section className="mk-ai-section mk-section-pad" id="ai">
      <div className="mk-content-grid">
        <SectionTitle kicker="THE AI COLLEAGUE" light description="Colliq’s idea is simple: assistance gets more useful when it understands the project around the question. Explore how one clear instruction can become an organized starting point.">
          Not just an AI that answers.<br /><em>An AI that understands the work.</em>
        </SectionTitle>
      </div>
      <Reveal className="mk-ai-demo">
        <div className="mk-demo-caption"><span>ILLUSTRATIVE PRODUCT CONCEPT</span><span>01: CONTEXT → ACTION</span></div>
        <div className="mk-command-bar">
          <span className="mk-command-mark"><BrandMark inverse /></span>
          <p>Prepare the website launch for Friday.</p>
          <button type="button" onClick={runDemo} disabled={playing}>{playing ? "Working…" : "Run again"} <ArrowRight size={16} /></button>
        </div>
        <div className="mk-ai-output">
          <div className="mk-output-thread">
            {aiSteps.map((step, index) => (
              <motion.div className={"mk-output-step" + (index < visible ? " is-visible" : "")} key={step.label} initial={false} animate={reduceMotionSafe(index, visible)} transition={{ duration: 0.35 }}>
                <span className="mk-step-number">0{index + 1}</span>
                <div><small>{step.label}</small><b>{step.title}</b><span>{step.meta}</span></div>
                {index === 2 ? <Sparkles size={18} /> : <Check size={18} />}
              </motion.div>
            ))}
          </div>
          <div className="mk-ai-summary">
            <small>COLLIQ / PROJECT NOTE</small>
            <h3>A clear brief,<br /><em>turned into motion.</em></h3>
            <p>Review the suggested structure before anything is added to the workspace.</p>
            <span className="mk-honesty-label">PREVIEW ONLY — NO ACTIONS EXECUTED</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function reduceMotionSafe(index: number, visible: number) {
  return index < visible ? { opacity: 1, x: 0, backgroundColor: "rgba(255,255,255,0.06)" } : { opacity: 0.18, x: -12, backgroundColor: "rgba(255,255,255,0)" };
}

const workflow = [
  ["01", "Describe the goal", "Start in plain language, not a template maze."],
  ["02", "Structure the work", "Turn intent into tasks, timing, and ownership."],
  ["03", "Bring people in", "Keep conversation beside the decisions it changes."],
  ["04", "See the signal", "Spot momentum, pressure, and what needs attention."],
  ["05", "Share delivery", "Give clients clarity without another status meeting."],
];

function Workflow() {
  return (
    <section className="mk-workflow mk-section-pad" id="workflow">
      <SectionTitle kicker="ONE CONNECTED WORKFLOW">An idea is only<br /><em>the beginning.</em></SectionTitle>
      <div className="mk-workflow-line">
        {workflow.map(([number, title, copy]) => (
          <motion.article key={number} whileHover={{ y: -4 }} transition={{ duration: 0.22 }}>
            <span className="mk-flow-dot">{number}</span>
            <div><h3>{title}</h3><p>{copy}</p></div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}


const taskExamples = ["Define campaign story", "Finalise launch page", "QA responsive states", "Client review"];

function ProductPanel({ view }: { view: WorkView }) {
  if (view === "Board") return (
    <div className="mk-board-view">
      {["TO DO · 3", "IN PROGRESS · 2", "READY · 2"].map((column, index) => (
        <div className="mk-board-col" key={column}><small>{column}</small>
          {taskExamples.slice(index, index + 2).map((task, i) => (
            <motion.div className="mk-ui-card" key={task} whileHover={{ y: -3 }}>
              <span className={"mk-tag mk-tag-" + index}>{i ? "Design" : "Launch"}</span>
              <b>{task}</b><div><span className="mk-avatar">{["M", "A", "J"][index]}</span><span>FRI {18 + i}</span></div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
  if (view === "List") return <div className="mk-list-view">{taskExamples.map((task, i) => (
    <div key={task}><span className={"mk-check-box" + (i === 0 ? " done" : "")}>{i === 0 && <Check size={13} />}</span><b>{task}</b><span>{["Jamie", "Amara", "Mika", "Client"][i]}</span><small>{["TODAY", "THU 17", "FRI 18", "FRI 18"][i]}</small></div>
  ))}</div>;
  if (view === "Timeline") return <div className="mk-timeline-view"><div className="mk-timeline-days">{["MON 14", "TUE 15", "WED 16", "THU 17", "FRI 18"].map((day) => <span key={day}>{day}</span>)}</div>
    {taskExamples.map((task, i) => <div className="mk-timeline-row" key={task}><b>{task}</b><span className={"mk-bar mk-bar-" + i} /></div>)}
  </div>;
  return <div className="mk-sprint-view"><div className="mk-sprint-score"><small>SPRINT 04</small><b>18<span>/24</span></b><p>points completed</p></div><div className="mk-sprint-bars">{[82, 64, 91, 48].map((value, i) => <div key={value}><span>Week {i + 1}</span><i><b style={{ width: value + "%" }} /></i><small>{value}%</small></div>)}</div></div>;
}

function Execution() {
  const [view, setView] = useState<WorkView>("Board");
  const views: WorkView[] = ["Board", "List", "Timeline", "Sprint"];
  return (
    <section className="mk-execution mk-section-pad" id="product">
      <div className="mk-content-grid">
        <SectionTitle kicker="PROJECT EXECUTION" description="Move from shape-of-the-week planning to the task in front of you. Explore these illustrative product views to see how the same work can be understood at different altitudes.">
          Room for the big picture.<br /><em>Tools for every detail.</em>
        </SectionTitle>
      </div>
      <Reveal className="mk-product-window">
        <div className="mk-product-topbar"><div className="mk-product-crumb"><BrandMark /><span>Arc Studio</span><b>/</b><strong>Website launch</strong></div><span className="mk-concept-label">INTERACTIVE CONCEPT</span></div>
        <div className="mk-view-tabs" role="tablist" aria-label="Project views">
          {views.map((item) => <button type="button" role="tab" aria-selected={view === item} className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>)}
        </div>
        <div className="mk-product-body" role="tabpanel"><AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}><ProductPanel view={view} /></motion.div></AnimatePresence></div>
        <div className="mk-feature-ticker">{["Dependencies", "Subtasks", "Custom fields", "Time logs", "Templates"].map((item) => <span key={item}><Plus size={13} />{item}</span>)}</div>
      </Reveal>
    </section>
  );
}

function People() {
  return (
    <section className="mk-people-section mk-section-pad" id="people">
      <div className="mk-people-copy">
        <SectionTitle kicker="BUILT FOR PEOPLE">Great work is<br /><em>a team sport.</em></SectionTitle>
        <p>Workload, meetings, collaboration, and recognition belong close to the work—not buried in a separate people system. See who needs room, who has momentum, and where a quick conversation will help.</p>
      </div>
      <Reveal className="mk-people-visual">
        <div className="mk-people-orbit">
          {["AM", "JK", "RS", "NO"].map((initials, i) => <motion.span className={"mk-person mk-person-" + i} key={initials} animate={{ y: [0, i % 2 ? 5 : -5, 0] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}>{initials}</motion.span>)}
          <div className="mk-orbit-core"><span>THIS WEEK</span><b>Balanced,<br />with one watch.</b><small>Jamie is near capacity.</small></div>
        </div>
        <div className="mk-team-note"><Sparkles size={18} /><div><small>A GOOD MOMENT</small><b>Three launch tasks landed today.</b><span>Recognition is part of the rhythm.</span></div></div>
      </Reveal>
    </section>
  );
}

function ClientDelivery() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mk-client-section mk-section-pad" id="clients">
      <div className="mk-content-grid"><SectionTitle kicker="CLIENT DELIVERY">Make progress visible.<br /><em>Make confidence contagious.</em></SectionTitle><p className="mk-section-description">Give clients a clearer view of delivery without inviting them into every internal detail. Fewer “quick update?” emails. More shared confidence in what happens next.</p></div>
      <Reveal className="mk-portal-scene">
        <div className="mk-portal-card">
          <header><div><small>CLIENT VIEW / ILLUSTRATIVE</small><h3>Northstar brand launch</h3></div><span className="mk-portal-live"><i /> Updated today</span></header>
          <div className="mk-portal-progress"><div><span>Overall progress</span><b>78%</b></div><i><b /></i></div>
          <div className="mk-portal-milestones">
            <div className="complete"><Check /><span><b>Strategy & direction</b><small>Approved 08 May</small></span></div>
            <div className="current"><Clock3 /><span><b>Visual system</b><small>In client review</small></span></div>
            <div><span className="mk-empty-dot" /><span><b>Launch package</b><small>Starts 20 May</small></span></div>
          </div>
          <button type="button" className="mk-portal-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>Latest project update <span>{open ? "−" : "+"}</span></button>
          <AnimatePresence>{open && <motion.div className="mk-portal-update" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>The visual system is ready for review. Once approved, the team will prepare final launch assets and handoff notes.</p></motion.div>}</AnimatePresence>
        </div>
        <div className="mk-portal-annotation"><Eye size={21} /><b>Clarity, without<br />the status chase.</b><span>Only the right detail reaches the client.</span></div>
      </Reveal>
    </section>
  );
}

const audiences: Record<Audience, { number: string; title: string; items: string[] }> = {
  "Agencies": { number: "01", title: "Keep the work sharp—and the client in the loop.", items: ["Campaigns and retainers", "Creative review", "Shareable progress"] },
  "Software teams": { number: "02", title: "Connect the sprint to the reason it matters.", items: ["Sprints and dependencies", "Meeting decisions", "Project health"] },
  "Growing teams": { number: "03", title: "Add structure without adding a rulebook.", items: ["Flexible templates", "Clear ownership", "Workload visibility"] }
};

function Audience() {
  const [active, setActive] = useState<Audience>("Agencies");
  const data = audiences[active];
  return (
    <section className="mk-audience mk-section-pad" id="teams">
      <SectionTitle kicker="MADE TO FLEX">Different disciplines.<br /><em>One connected way to work.</em></SectionTitle>
      <div className="mk-audience-layout">
        <div className="mk-audience-tabs" role="tablist" aria-label="Teams">
          {(Object.keys(audiences) as Audience[]).map((name) => <button role="tab" aria-selected={active === name} type="button" className={active === name ? "active" : ""} onClick={() => setActive(name)} key={name}><span>{audiences[name].number}</span>{name}<ArrowUpRight size={16} /></button>)}
        </div>
        <AnimatePresence mode="wait"><motion.div className={"mk-audience-card mk-audience-" + data.number} key={active} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.22 }}><span className="mk-audience-number">{data.number}</span><h3>{data.title}</h3><div>{data.items.map((item) => <span key={item}><Check size={14} />{item}</span>)}</div><div className="mk-audience-graphic"><i /><i /><i /></div></motion.div></AnimatePresence>
      </div>
    </section>
  );
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const links = [{ label: "Platform", href: "#platform" }, { label: "How it works", href: "#workflow" }, { label: "For teams", href: "#teams" }, { label: "Client delivery", href: "#clients" }];
  return (
    <nav className="mk-nav" aria-label="Primary navigation">
      <Link className="mk-logo" href="/" aria-label="Colliq home"><BrandMark /><b>colliq</b><span>WORK, CONNECTED.</span></Link>
      <div className={"mk-nav-links" + (open ? " open" : "")}>{links.map((link) => <a href={link.href} onClick={() => setOpen(false)} key={link.label}>{link.label}</a>)}</div>
      <div className="mk-nav-actions"><Link className="mk-sign-in" href="https://app.colliq.app/login">Sign in</Link><Link className="mk-nav-cta" href="https://app.colliq.app/register">Get started <ArrowUpRight size={16} /></Link></div>
      <button type="button" className="mk-menu-button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    </nav>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <header className="mk-hero" id="top">
      <Navigation />
      <div className="mk-hero-grid">
        <div className="mk-hero-copy">
          <motion.p className="mk-eyebrow" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>THE WORKSPACE WITH A COLLEAGUE BUILT IN</motion.p>
          <h1><motion.span className="mk-headline-line" initial={reduce ? false : { opacity: 0, y: "105%" }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.1 }}>Great work doesn’t</motion.span><motion.span className="mk-headline-line" initial={reduce ? false : { opacity: 0, y: "105%" }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.22 }}>happen <em>in tabs.</em></motion.span></h1>
          <div className="mk-hero-bottom"><motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55 }}>Colliq brings projects, people, clients, and contextual AI into one connected workspace—so your team can spend less time coordinating and more time making things happen.</motion.p>
            <motion.div className="mk-hero-actions" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}><LinkArrow href="https://app.colliq.app/register" primary>Meet Colliq</LinkArrow><LinkArrow href="#ai">See how it works</LinkArrow></motion.div>
          </div>
        </div>
        <LivingCanvas />
      </div>
      <div className="mk-hero-foot"><span>PROJECTS</span><i /><span>PEOPLE</span><i /><span>INTELLIGENCE</span><i /><span>DELIVERY</span><b>SCROLL TO CONNECT ↓</b></div>
    </header>
  );
}

function FinalCTA() {
  return (
    <section className="mk-final-cta mk-section-pad" id="start">
      <div className="mk-final-path" aria-hidden="true"><i /><i /><i /><i /></div>
      <Kicker>ONE PLACE. MORE MOMENTUM.</Kicker>
      <h2>Make room for<br /><em>better work.</em></h2>
      <p>Bring projects, people, clients, and AI together. Give your team a smarter place to plan, collaborate, and move work forward.</p>
      <div className="mk-final-actions"><LinkArrow href="https://app.colliq.app/register" primary>Create your workspace</LinkArrow><LinkArrow href="#top">Back to the canvas</LinkArrow></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-footer-top"><div className="mk-footer-brand"><BrandMark /><b>colliq</b><span>Your smartest colleague.</span></div>
        <div className="mk-footer-links"><div><small>EXPLORE</small><a href="#platform">Platform</a><a href="#ai">AI colleague</a><a href="#product">Product views</a></div><div><small>FOR TEAMS</small><a href="#teams">Agencies</a><a href="#teams">Software teams</a><a href="#teams">Growing teams</a></div><div><small>ACCOUNT</small><Link href="https://app.colliq.app/login">Sign in</Link><Link href="https://app.colliq.app/register">Create account</Link><Link href="/terms">Terms</Link></div></div>
      </div>
      <div className="mk-footer-bottom"><span>© {new Date().getFullYear()} COLLIQ</span><span>Illustrative product previews are labelled.</span><span>MADE FOR WORK THAT MATTERS</span></div>
    </footer>
  );
}

export default function MarketingHome() {
  const reduce = useReducedMotion();
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".mk-reveal");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="mk-page">
      <main>
        <Hero />
        <Frustration />
        <BrandMoment />
        <AIDemo />
        <Workflow />
        <Execution />
        <People />
        <ClientDelivery />
        <Audience />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
