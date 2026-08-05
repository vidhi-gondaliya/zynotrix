import { create } from "zustand";

export interface TourStep {
  tourId: string | null;   // data-tour-id value; null = centred overlay
  title: string;
  desc: string;
  pos: "right" | "bottom" | "top" | "left" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    tourId: null,
    title: "Welcome to Colliq! 🎉",
    desc: "Let us show you around your workspace. This 2-minute tour covers everything you need to hit the ground running.",
    pos: "center",
  },
  {
    tourId: "tour-sidebar",
    title: "Your Navigation Hub",
    desc: "The sidebar gives you access to Projects, Tasks, Timelines, Chat, Meetings, and more. Click any section header to expand it.",
    pos: "right",
  },
  {
    tourId: "tour-header",
    title: "Quick Actions Bar",
    desc: "Search anything with ⌘K, create new items with the + button, and punch in/out for time tracking — all up here.",
    pos: "bottom",
  },
  {
    tourId: "tour-ai",
    title: "AI Assistant",
    desc: "Click this anytime to chat with your AI copilot. Generate tasks, get project summaries, or ask anything about your work.",
    pos: "top",
  },
  {
    tourId: "tour-notifications",
    title: "Stay in the Loop",
    desc: "Notifications keep you updated on assignments, due dates, mentions, and project activity in real time.",
    pos: "right",
  },
  {
    tourId: "tour-billing",
    title: "Manage Your Plan",
    desc: "Upgrade your plan, buy AI credits, view usage, and download invoices — all from the Billing page.",
    pos: "right",
  },
  {
    tourId: "tour-settings",
    title: "Personalize Colliq",
    desc: "Switch themes, configure notifications, set up integrations, and manage your profile from Settings.",
    pos: "right",
  },
  {
    tourId: null,
    title: "You're all set! 🚀",
    desc: "That's the full tour. Explore at your own pace — and whenever you need help, your AI assistant is just one click away.",
    pos: "center",
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
