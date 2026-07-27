# ZYNOTRIX — Project Overview

## What Is ZYNOTRIX?

ZYNOTRIX is an AI-powered team task management and collaboration SaaS platform built for modern digital agencies, software teams, and small-to-mid-size organizations. It combines project management, real-time team chat, meeting scheduling, document collaboration, attendance tracking, and a built-in gamification engine — all in one unified workspace.

The product sits at the intersection of Jira (task management), Slack (team communication), Notion (documents), and Leapsome (team gamification) — but purpose-built for teams that want one tool instead of four integrations.

---

## The Problem ZYNOTRIX Solves

Modern teams suffer from **tool sprawl**: a project tracker here, a chat app there, a meeting tool elsewhere, and a spreadsheet for attendance. Context-switching kills productivity; integrations break; data lives in silos.

ZYNOTRIX collapses the essential collaboration stack into a single coherent workspace with:
- Tasks that live next to the conversations about those tasks
- Meetings that auto-generate AI notes and action items
- Attendance punch-in woven into the same UI where you check your tasks
- A gamification layer that makes work more motivating without a separate HR system

---

## Target Audience

### Primary Users
- **Digital agencies** (5–50 people) managing client projects with tight deadlines and deliverable tracking
- **Software development teams** that need sprint management + Kanban + dependency tracking
- **Startup teams** that want enterprise-grade project management without the enterprise price tag

### Secondary Users
- **Freelancers** who need the Personal Project mode for solo work tracking
- **Remote-first companies** that need async collaboration with real-time fallback (SSE chat, DMs)

### Demo Organization
The application ships with a seeded demo org: **Nexus Digital Agency** — 9 users across OWNER, ADMIN, MANAGER, and MEMBER roles, 5 projects, 30+ tasks with full data for showcasing every feature.

---

## Business Model (Planned / [Inferred])

| Tier | Target | Expected Price |
|------|--------|---------------|
| **Starter** | Solo / Freelancer | Free |
| **Team** | 5–20 seats | $12–15/seat/month |
| **Business** | 20–100 seats | $20–25/seat/month |
| **Enterprise** | 100+ seats | Custom |

The `plan` field on the `Organization` model currently stores `"FREE"` as the default. Paid plan enforcement logic is **[MISSING]** — the schema is ready but gating is not implemented.

---

## Unique Selling Points

1. **AI-first UX** — Claude AI is woven into the product: natural-language task creation, smart standup reports, meeting notes, project health scoring, semantic search, recurring task suggestions, and a persistent AI assistant bubble.
2. **Built-in gamification** — Points, badges, leaderboards, and coupons without a third-party integration.
3. **SSE real-time** — Instant notifications and live chat without WebSocket infrastructure costs.
4. **Client Portal** — Password-protected read-only portals for external stakeholders, shareable via token URL.
5. **Attendance tracking** — Built-in punch clock so teams eliminate a separate time-tracking tool.
6. **One-click Google Meet** — Schedule meetings with auto-generated Google Meet links via the Calendar API.
7. **Design system** — "Obsidian Command" design system: crisp dark mode with indigo-amber palette, not generic-SaaS-blue.

---

## Product Maturity Level

| Dimension | Status |
|-----------|--------|
| Core task management | Production-ready |
| Kanban board (drag-and-drop) | Production-ready |
| Real-time chat | Production-ready |
| AI features | Beta (no error rate monitoring) |
| Sprint management | Beta |
| Attendance tracking | Beta |
| Gamification | Beta |
| Webhooks (GitHub, Slack) | Alpha / Demo-only |
| Mobile responsiveness | Partial — desktop-first |
| Test coverage | None — **[MISSING]** |
| Error monitoring | None — **[MISSING]** |

---

## Technology Platform Summary

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (REST)
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Prisma 5.22
- **Auth**: NextAuth v5 (beta) — JWT strategy
- **AI**: Anthropic Claude SDK (`claude-opus-4-5` default, `claude-haiku-4-5` fast)
- **Real-time**: Server-Sent Events (SSE) — no WebSocket dependency
- **Drag-and-drop**: `@dnd-kit`
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Calendar**: `react-big-calendar`
- **Deployment**: Vercel + Neon (cloud Postgres)

---

## Future Vision

### 6-Month Goals
- Mobile app (React Native or progressive web app)
- Email notification delivery (SMTP integration)
- Stripe billing integration with plan enforcement
- Public API for external integrations

### 12-Month Goals
- AI project planning from brief (full project scaffolding)
- Custom workflow builder (no-code automations)
- Resource planning / workload forecasting
- Time-billing and invoice generation

### 3-Year Vision
- Become the default workspace for digital agencies in South Asia and SEA markets
- Plugin marketplace allowing third-party integrations
- White-label offering for agencies reselling to clients

---

## Repository Structure

```
zynotrix/
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── (app)/             # Authenticated app pages
│   │   ├── (auth)/            # Login/register/create-workspace
│   │   ├── portal/            # Public client portal
│   │   └── api/               # All REST API endpoints
│   ├── components/            # Shared UI components
│   ├── lib/                   # Utilities, auth, AI, SSE, permissions
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand global stores
│   └── types/                 # TypeScript type definitions
├── prisma/
│   ├── schema.prisma          # Full data model (50+ models)
│   └── seed.ts                # Demo data seed script
├── documentation/             # This documentation folder
└── public/                    # Static assets
```

---

## Key Metrics (Demo Data)

- 9 team members across 4 role levels
- 5 active projects
- 30+ tasks in various statuses
- 5 chat channels
- Reward points system seeded and active
- Full audit log enabled
