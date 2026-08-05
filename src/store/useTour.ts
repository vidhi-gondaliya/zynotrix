import { create } from "zustand";

export interface TourStep {
  tourId: string | null;
  title: string;
  subtitle: string;
  desc: string;
  highlights: string[];
  icon: string;
  badge: string;
  badgeColor: string;
  pos: "right" | "bottom" | "top" | "left" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    tourId: null,
    icon: "🚀",
    badge: "Welcome",
    badgeColor: "#7C3AED",
    pos: "center",
    title: "Meet Colliq — Your AI-Powered Workspace",
    subtitle: "Project management that actually works",
    desc: "The all-in-one platform where AI handles the busy-work so your team can focus on shipping. Built to replace Jira + Slack + Notion — at a fraction of the cost.",
    highlights: [
      "AI generates tasks, plans & summaries instantly",
      "12+ built-in tools — chat, meetings, docs, sprints",
      "From solo freelancers to 500-person enterprise teams",
    ],
  },
  {
    tourId: "tour-sidebar",
    icon: "🗂️",
    badge: "All-in-One",
    badgeColor: "#2563EB",
    pos: "right",
    title: "Every Tool. One Sidebar.",
    subtitle: "Stop switching apps. Start shipping.",
    desc: "Projects, Kanban boards, Sprint planning, Gantt timelines, Team chat, Video meetings, Documents, Time tracking, Automations — all in one sidebar. Zero context switching.",
    highlights: [
      "12+ tools built-in — no integrations needed",
      "Collapsible sidebar for deep focus mode",
      "Role-based access — everyone sees what they need",
    ],
  },
  {
    tourId: null,
    icon: "✨",
    badge: "AI Feature",
    badgeColor: "#7C3AED",
    pos: "center",
    title: "AI Builds Your Board in Seconds",
    subtitle: "From project name to full sprint — instantly",
    desc: "Create a project, describe it in one sentence, and click 'Generate with AI'. Claude instantly creates 6-8 tailored tasks with priorities, statuses, and rich descriptions. Your sprint starts in under 10 seconds.",
    highlights: [
      "6-8 AI-generated tasks tailored to your project",
      "Kanban, List, Timeline & Sprint views — all views included",
      "Custom columns, drag-and-drop, WIP limits & more",
    ],
  },
  {
    tourId: "tour-ai",
    icon: "🤖",
    badge: "AI Copilot",
    badgeColor: "#EC4899",
    pos: "top",
    title: "Your AI Copilot Never Clocks Out",
    subtitle: "Powered by Claude — the world's best AI assistant",
    desc: "Ask your AI anything: generate a project plan, summarize overdue tasks, write task descriptions, identify blockers, or plan your week. It knows your entire workspace and responds in seconds.",
    highlights: [
      "Powered by Claude (Anthropic) — industry-leading AI",
      "Full workspace context — not just generic answers",
      "Standup reports, risk analysis, workload balancing",
    ],
  },
  {
    tourId: "tour-header",
    icon: "⌨️",
    badge: "Productivity",
    badgeColor: "#0891B2",
    pos: "bottom",
    title: "⌘K — Command Your Entire Workspace",
    subtitle: "Search, create, navigate — without lifting your hands",
    desc: "Press ⌘K to instantly search tasks, jump to projects, create items, or run commands. Plus: one-click Punch In / Punch Out for time tracking. No Toggl, no Harvest — it's all built in.",
    highlights: [
      "Universal search across all projects & tasks",
      "Create tasks instantly without breaking your flow",
      "Built-in time tracking — accurate billing, zero friction",
    ],
  },
  {
    tourId: null,
    icon: "💬",
    badge: "Collaboration",
    badgeColor: "#059669",
    pos: "center",
    title: "Chat & Video Meetings — Built In",
    subtitle: "No Slack. No Zoom. Just Colliq.",
    desc: "Real-time team chat with channels and direct messages. Schedule video meetings with Google Meet integration. Keep all conversations next to the tasks they're about — context is never lost.",
    highlights: [
      "Team channels, DMs & threaded replies",
      "Google Meet video meetings with one click",
      "Meeting action items linked directly to tasks",
    ],
  },
  {
    tourId: null,
    icon: "🎯",
    badge: "Client Portal",
    badgeColor: "#D97706",
    pos: "center",
    title: "Impress Clients with a Dedicated Portal",
    subtitle: "Professional visibility without exposing internals",
    desc: "Share a beautiful, branded client-facing portal with real-time project status, milestones, and progress reports — without giving clients access to your internal workspace or tools.",
    highlights: [
      "Shareable portal link — no client login required",
      "Real-time progress, tasks & milestone visibility",
      "White-label ready for agency & enterprise teams",
    ],
  },
  {
    tourId: null,
    icon: "⚡",
    badge: "Automations",
    badgeColor: "#B45309",
    pos: "center",
    title: "Workflows That Run Themselves",
    subtitle: "Set it once. Let it run forever.",
    desc: "Build automations like 'When a task moves to Done → notify the client and log time'. Free your team from repetitive admin work. Colliq handles the paperwork so you can focus on the work.",
    highlights: [
      "Visual trigger-action workflow builder",
      "Auto-notify, assign, move, log time & more",
      "Saves 3+ hours of admin work per team per week",
    ],
  },
  {
    tourId: "tour-notifications",
    icon: "🔔",
    badge: "Stay Updated",
    badgeColor: "#7C3AED",
    pos: "right",
    title: "Smart Notifications. Zero Noise.",
    subtitle: "Get alerted on what matters, silenced on what doesn't",
    desc: "Priority-filtered notifications via browser, email, or WhatsApp. Set DND hours, digest mode, and minimum priority thresholds — so you're always informed without being overwhelmed.",
    highlights: [
      "Browser, email & WhatsApp notifications",
      "Priority filter — only see what you set",
      "Do Not Disturb hours & daily digest mode",
    ],
  },
  {
    tourId: "tour-billing",
    icon: "💳",
    badge: "Pricing",
    badgeColor: "#475569",
    pos: "right",
    title: "Flexible Plans That Scale With You",
    subtitle: "Start free. Scale when you're ready.",
    desc: "Free plan for individuals, Starter for small teams, Growth for scaling teams, Scale for enterprise. Buy AI credits on demand. Every plan includes the full feature set — no feature-gating surprises.",
    highlights: [
      "Free plan with core features — no credit card needed",
      "Pay-as-you-go AI credits — only pay for what you use",
      "Annual billing saves up to 20% on every plan",
    ],
  },
  {
    tourId: "tour-settings",
    icon: "⚙️",
    badge: "Personalize",
    badgeColor: "#374151",
    pos: "right",
    title: "Colliq Adapts to How You Work",
    subtitle: "Every preference. Every integration. Your way.",
    desc: "Dark mode or light, custom notification rules, WhatsApp and email integrations, granular role-based permissions, and SSO for enterprise teams. Colliq fits your workflow — not the other way around.",
    highlights: [
      "Dark / light theme with instant toggle",
      "RBAC — granular permissions for every role",
      "SSO, Slack, WhatsApp & email integrations",
    ],
  },
  {
    tourId: null,
    icon: "🎉",
    badge: "Let's Go!",
    badgeColor: "#16A34A",
    pos: "center",
    title: "You're Ready to Build Something Great",
    subtitle: "Most teams are productive in under 5 minutes",
    desc: "Create your first project, let AI generate your initial board, then invite your team. Everything is already set up — just add your work and start shipping.",
    highlights: [
      "Create your first AI-powered project now",
      "Invite teammates — they're onboarded instantly",
      "Your AI copilot is ready to help anytime",
    ],
  },
];

interface TourState {
  active: boolean;
  step: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

export const useTour = create<TourState>((set) => ({
  active: false,
  step: 0,
  start: () => set({ active: true, step: 0 }),
  next: () =>
    set((s) => {
      if (s.step >= TOUR_STEPS.length - 1) {
        if (typeof window !== "undefined") localStorage.setItem("colliq_tour_done", "1");
        return { active: false, step: 0 };
      }
      return { step: s.step + 1 };
    }),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => {
    if (typeof window !== "undefined") localStorage.setItem("colliq_tour_done", "1");
    set({ active: false, step: 0 });
  },
}));
