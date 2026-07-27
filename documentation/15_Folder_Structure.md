# ZYNOTRIX — Folder Structure

## Root Level

```
zynotrix/
├── src/                    # All application source code
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── documentation/          # This documentation folder
├── node_modules/           # Dependencies (git-ignored)
├── .next/                  # Next.js build output (git-ignored)
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── next-env.d.ts           # Next.js TypeScript declarations (auto-generated)
└── README.md               # Project readme
```

---

## `src/` Directory

```
src/
├── app/                    # Next.js App Router (pages + API)
│   ├── globals.css         # Global styles, design system CSS variables
│   ├── layout.tsx          # Root layout (fonts, SessionProvider, Toaster)
│   ├── page.tsx            # Root page (redirect only)
│   ├── favicon.ico         # App favicon
│   ├── fonts/              # Local font files (Geist)
│   │   ├── GeistVF.woff
│   │   └── GeistMonoVF.woff
│   ├── (auth)/             # Auth route group (no shared layout)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── create-workspace/page.tsx
│   ├── (app)/              # App route group (sidebar + header layout)
│   │   ├── layout.tsx      # App shell (Sidebar, Header, CommandPalette, AIChatBubble)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx            # Projects list
│   │   │   ├── new/page.tsx        # Create project
│   │   │   └── [projectId]/
│   │   │       ├── layout.tsx      # Project navigation tabs
│   │   │       ├── page.tsx        # Project overview
│   │   │       ├── board/page.tsx  # Kanban board
│   │   │       ├── list/page.tsx   # Task list
│   │   │       ├── timeline/page.tsx
│   │   │       ├── sprint/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── chat/
│   │   │   ├── page.tsx            # Channel list
│   │   │   └── [channelId]/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── [conversationId]/page.tsx
│   │   ├── meetings/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── rewards/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── workload/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── integrations/page.tsx
│   │   ├── automations/page.tsx
│   │   ├── templates/page.tsx
│   │   ├── import-export/page.tsx
│   │   └── ai/
│   │       ├── assistant/page.tsx
│   │       ├── reports/page.tsx
│   │       ├── health/page.tsx
│   │       └── search/page.tsx
│   ├── portal/
│   │   └── [token]/page.tsx        # Public client portal
│   └── api/                        # All API route handlers
│       ├── auth/
│       │   ├── [...nextauth]/route.ts  # NextAuth handler
│       │   └── register/route.ts
│       ├── organizations/route.ts
│       ├── projects/
│       │   ├── route.ts
│       │   └── [projectId]/
│       │       ├── route.ts
│       │       ├── tasks/route.ts
│       │       ├── health/route.ts
│       │       ├── sprints/
│       │       │   ├── route.ts
│       │       │   └── [sprintId]/route.ts
│       │       ├── custom-fields/
│       │       │   ├── route.ts
│       │       │   └── [fieldId]/route.ts
│       │       ├── client-portal/route.ts
│       │       ├── import-tasks/route.ts
│       │       └── export-template/route.ts
│       ├── tasks/
│       │   ├── upcoming/route.ts
│       │   └── [taskId]/
│       │       ├── move/route.ts
│       │       ├── comments/route.ts
│       │       ├── subtasks/route.ts
│       │       ├── subtask-comments/route.ts
│       │       ├── activity/route.ts
│       │       ├── assignees/route.ts
│       │       ├── dependencies/route.ts
│       │       ├── time/route.ts
│       │       ├── links/route.ts
│       │       └── custom-fields/route.ts
│       ├── channels/
│       │   ├── route.ts
│       │   └── [channelId]/
│       │       ├── messages/route.ts
│       │       ├── sse/route.ts
│       │       └── members/route.ts
│       ├── conversations/
│       │   ├── route.ts
│       │   └── [conversationId]/
│       │       ├── messages/route.ts
│       │       └── sse/route.ts
│       ├── meetings/
│       │   └── [meetingId]/route.ts
│       ├── notifications/
│       │   ├── route.ts
│       │   ├── read-all/route.ts
│       │   ├── sse/route.ts
│       │   └── preferences/route.ts
│       ├── documents/
│       │   ├── route.ts
│       │   └── [documentId]/
│       │       ├── route.ts
│       │       └── share/route.ts
│       ├── attachments/
│       │   ├── route.ts
│       │   └── [attachmentId]/route.ts
│       ├── admin/
│       │   ├── bootstrap/route.ts
│       │   ├── users/route.ts (and [userId]/role/route.ts)
│       │   ├── roles/
│       │   │   ├── route.ts
│       │   │   └── [roleId]/route.ts
│       │   ├── rewards/route.ts
│       │   └── coupons/route.ts (and [couponId]/route.ts)
│       ├── rewards/
│       │   ├── route.ts
│       │   └── redeem/route.ts
│       ├── attendance/
│       │   ├── route.ts
│       │   ├── clock-in/route.ts
│       │   └── clock-out/route.ts
│       ├── ai/
│       │   ├── assistant/route.ts
│       │   ├── project-description/route.ts
│       │   ├── project-template/route.ts
│       │   ├── meeting-notes/route.ts
│       │   ├── recurring/route.ts
│       │   ├── insights/route.ts
│       │   └── search/route.ts
│       ├── dashboard/route.ts
│       ├── alerts/route.ts
│       ├── portal/[token]/route.ts
│       ├── automations/
│       │   └── [automationId]/route.ts
│       ├── integrations/
│       │   ├── slack/test/route.ts
│       │   ├── google-calendar/sync/route.ts
│       │   └── whatsapp/test/route.ts
│       └── webhooks/
│           ├── github/route.ts
│           ├── slack/route.ts
│           └── email/route.ts
│
├── components/             # Reusable React components
│   ├── ui/                 # Primitive UI components
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Input.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── Skeleton.tsx
│   │   └── Textarea.tsx
│   ├── layout/             # App layout components
│   │   ├── Header.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── PunchClock.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ThemeInit.tsx
│   │   └── ThemeToggle.tsx
│   ├── ai/                 # AI-specific components
│   │   ├── AIChatBubble.tsx
│   │   ├── MeetingNotesPanel.tsx
│   │   ├── NLTaskCreator.tsx
│   │   └── StandupWidget.tsx
│   ├── command/            # Command palette
│   │   └── CommandPalette.tsx
│   ├── dashboard/          # Dashboard-specific components
│   │   └── MetricCard.tsx
│   ├── kanban/             # Kanban board components
│   │   └── BoardTemplateModal.tsx
│   └── onboarding/         # Onboarding flow
│       └── OnboardingWizard.tsx
│
├── lib/                    # Utilities and services
│   ├── auth.ts             # NextAuth config (providers, callbacks)
│   ├── org.ts              # requireOrg() multi-tenancy guard
│   ├── prisma.ts           # Prisma Client singleton
│   ├── claude.ts           # Anthropic AI client + helpers
│   ├── sse.ts              # SSE broadcast infrastructure
│   ├── dm-sse.ts           # SSE for direct messages
│   ├── notifications.ts    # Notification creation + filtering
│   ├── permissions.ts      # RBAC permission definitions + helpers
│   ├── task-activity.ts    # Task activity logging
│   ├── nlp-parser.ts       # Natural language task parsing
│   ├── google-meet.ts      # Google Calendar/Meet API helpers
│   ├── board-templates.ts  # Preset board templates
│   └── cn.ts               # className utility (clsx/twMerge wrapper)
│
├── hooks/                  # Custom React hooks
│   ├── useClaude.ts        # AI streaming hook
│   └── useSSE.ts           # SSE subscription hook
│
├── store/                  # Zustand global stores
│   ├── useChat.ts          # Chat/channel state
│   ├── useNotifications.ts # Notification state
│   └── useTheme.ts         # Theme preference + sidebar state
│
└── types/                  # TypeScript type definitions
    └── index.ts            # Shared types (Task, Project, Meeting, etc.)
```

---

## `prisma/` Directory

```
prisma/
├── schema.prisma           # Full Prisma schema (50+ models)
├── migrations/             # Migration files (if using migrate dev)
└── seed.ts                 # Demo data seed script
```

---

## Key Dependencies

| File | Imports From |
|------|-------------|
| All API routes | `src/lib/prisma`, `src/lib/auth`, `src/lib/org` |
| AI routes | `src/lib/claude` |
| Chat routes | `src/lib/sse` |
| Notification routes | `src/lib/notifications`, `src/lib/sse` |
| Task routes | `src/lib/task-activity`, `src/lib/notifications` |
| Admin routes | `src/lib/permissions` |
| All pages | `src/components/`, `next-auth/react`, `lucide-react` |

---

## Naming Conventions

| Pattern | Example |
|---------|---------|
| Pages | `page.tsx` (required by Next.js) |
| Layouts | `layout.tsx` (required by Next.js) |
| API routes | `route.ts` (required by Next.js) |
| Components | PascalCase: `MetricCard.tsx` |
| Hooks | camelCase with `use` prefix: `useSSE.ts` |
| Stores | camelCase with `use` prefix: `useTheme.ts` |
| Lib files | camelCase: `task-activity.ts` |
| Types | PascalCase for interfaces/types in `types/index.ts` |
