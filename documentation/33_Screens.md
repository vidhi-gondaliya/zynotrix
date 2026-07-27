# ZYNOTRIX — Screens Documentation

Every screen in the ZYNOTRIX application with its URL, purpose, components, and access requirements.

---

## Public / Auth Screens

### Root Redirect
- **URL**: `/`
- **File**: `src/app/page.tsx`
- **Purpose**: Immediate redirect — logged-in users go to `/dashboard`, logged-out users go to `/login`
- **Auth Required**: No
- **Components**: None — redirect only
- **Notes**: No landing page content. Redirect logic is in `src/middleware.ts`.

---

### Login
- **URL**: `/login`
- **File**: `src/app/(auth)/login/page.tsx`
- **Purpose**: User sign-in via email/password or Google OAuth
- **Auth Required**: No (redirect to dashboard if already logged in)
- **Components**:
  - Email/password form
  - Google OAuth button (conditionally shown)
  - "Sign up" link
- **Providers**: NextAuth credentials + GoogleProvider
- **Notes**: Google button only appears if `GOOGLE_CLIENT_ID` is set

---

### Register
- **URL**: `/register`
- **File**: `src/app/(auth)/register/page.tsx`
- **Purpose**: New user account creation
- **Auth Required**: No
- **Components**:
  - Name, email, password fields
  - Submit button
- **Notes**: Creates a User record; no email verification; after registration, redirects to `/create-workspace`

---

### Create Workspace
- **URL**: `/create-workspace`
- **File**: `src/app/(auth)/create-workspace/page.tsx`
- **Purpose**: Create the user's first organization
- **Auth Required**: Yes (user logged in, but no org)
- **Components**:
  - Workspace name input
  - Create button
- **Notes**: Triggered by middleware when logged-in user has no `organizationId` in JWT. Creates Organization + OrgMembership with OWNER role.

---

## App Shell (Applied to All App Screens)

### App Layout
- **File**: `src/app/(app)/layout.tsx`
- **Components Always Rendered**:
  - `Sidebar` (196px wide, collapsible)
  - `Header` (56px tall, breadcrumbs + search + notifications + user menu)
  - `NotificationProvider` (SSE connection to `/api/notifications/sse`)
  - `CommandPalette` (modal, triggered by Ctrl+K)
  - `AIChatBubble` (floating, bottom-right)
- **Auth Required**: Yes (all app routes protected by middleware)

---

## Dashboard

### Dashboard
- **URL**: `/dashboard`
- **File**: `src/app/(app)/dashboard/page.tsx`
- **Purpose**: Command center — metrics, upcoming tasks, charts, AI insights
- **Auth Required**: Yes (any role)
- **Components**:
  - Critical risk banner (AnimatePresence, conditional)
  - Greeting hero (time-aware: Good morning/afternoon/evening)
  - 4 `MetricCard` components (total tasks, completed, overdue, active projects)
  - Upcoming tasks list (today + tomorrow deadlines)
  - AreaChart (14-day task completion trend)
  - BarChart (team activity per member)
  - Recent tasks list
  - Status breakdown (pie/donut visual)
  - Upcoming meetings list
  - AI Insights card (streaming from `/api/ai/insights`)
  - `StandupWidget` (generates AI standup)
  - `OnboardingWizard` (first-visit only, localStorage check)
- **API Calls**: `/api/dashboard`, `/api/tasks/upcoming`, `/api/ai/insights`

---

## Projects

### Projects List
- **URL**: `/projects`
- **File**: `src/app/(app)/projects/page.tsx`
- **Purpose**: Grid of all active projects with status and health indicators
- **Auth Required**: Yes (any role)
- **Components**:
  - Project cards (name, status, member count, health badge)
  - Filter buttons (All / Active / Completed / Archived)
  - "New Project" button
- **API Calls**: `GET /api/projects`

---

### New Project
- **URL**: `/projects/new`
- **File**: `src/app/(app)/projects/new/page.tsx`
- **Purpose**: Create a new project
- **Auth Required**: Yes (requires `projects:create` permission)
- **Components**: Project creation form (name, description, status, dates, budget, template selection)
- **API Calls**: `POST /api/projects`

---

### Project Board (Kanban)
- **URL**: `/projects/[projectId]/board`
- **File**: `src/app/(app)/projects/[projectId]/board/page.tsx`
- **Purpose**: Drag-and-drop Kanban view of project tasks
- **Auth Required**: Yes (project member)
- **Components**:
  - Columns: TODO, IN_PROGRESS, IN_REVIEW, DONE
  - Task cards (title, assignee avatar, due date, priority badge)
  - Drag handles (`@dnd-kit/core`)
  - "Add Task" button per column
  - Task detail modal on card click
- **API Calls**: `GET /api/projects/[projectId]/tasks`, `PATCH /api/tasks/[taskId]/move`

---

### Project List View
- **URL**: `/projects/[projectId]/list`
- **File**: `src/app/(app)/projects/[projectId]/list/page.tsx`
- **Purpose**: Flat list view of all project tasks with sorting and filtering
- **Auth Required**: Yes (project member)
- **Components**:
  - Task rows with inline status/assignee/due date
  - Column sort headers
  - Status/priority filters
- **API Calls**: `GET /api/projects/[projectId]/tasks`

---

### Project Sprint View
- **URL**: `/projects/[projectId]/sprint`
- **File**: `src/app/(app)/projects/[projectId]/sprint/page.tsx`
- **Purpose**: Sprint planning and tracking interface
- **Auth Required**: Yes (project member)
- **Components**:
  - Active sprint header (name, start/end dates, velocity)
  - Sprint task list with story points
  - Backlog section
  - "Start Sprint" / "Complete Sprint" buttons
- **API Calls**: `/api/projects/[projectId]/sprints`

---

### Project Timeline
- **URL**: `/projects/[projectId]/timeline`
- **File**: `src/app/(app)/projects/[projectId]/timeline/page.tsx`
- **Purpose**: Gantt-style timeline view of tasks and sprints
- **Auth Required**: Yes (project member)
- **Notes**: Uses `react-big-calendar` in Timeline view mode **[Inferred]**

---

### Project Settings
- **URL**: `/projects/[projectId]/settings`
- **File**: `src/app/(app)/projects/[projectId]/settings/page.tsx`
- **Purpose**: Edit project details, custom fields, manage members
- **Auth Required**: Yes (requires `projects:edit` permission)
- **API Calls**: `GET/PATCH /api/projects/[projectId]`

---

## Tasks

### My Tasks
- **URL**: `/tasks`
- **File**: `src/app/(app)/tasks/page.tsx`
- **Purpose**: Cross-project view of all tasks assigned to the current user
- **Auth Required**: Yes (any role)
- **Components**:
  - Task list grouped by project or status
  - Filter: Today, This Week, Overdue, All
  - Quick status update inline

---

## Chat

### Channel List
- **URL**: `/chat`
- **File**: `src/app/(app)/chat/page.tsx`
- **Purpose**: List of all org channels with unread indicators
- **Auth Required**: Yes
- **Components**: Channel list sidebar, "Create Channel" button

---

### Channel View
- **URL**: `/chat/[channelId]`
- **File**: `src/app/(app)/chat/[channelId]/page.tsx`
- **Purpose**: Real-time chat room for a specific channel
- **Auth Required**: Yes (channel member)
- **Components**:
  - Message list (scrollable, newest at bottom)
  - Message input with emoji picker
  - Channel header (name, members, settings)
  - SSE connection for real-time messages
- **API Calls**: `GET /api/channels/[channelId]/messages`, SSE `/api/channels/[channelId]/sse`

---

## Direct Messages

### DM List
- **URL**: `/messages`
- **File**: `src/app/(app)/messages/page.tsx`
- **Purpose**: List of direct message conversations
- **Auth Required**: Yes

---

### DM Conversation
- **URL**: `/messages/[conversationId]`
- **File**: `src/app/(app)/messages/[conversationId]/page.tsx`
- **Purpose**: One-to-one or group direct message thread
- **Auth Required**: Yes (conversation participant)

---

## Meetings

### Meetings Calendar
- **URL**: `/meetings`
- **File**: `src/app/(app)/meetings/page.tsx`
- **Purpose**: Calendar view of scheduled meetings
- **Auth Required**: Yes
- **Components**: `react-big-calendar` in Month/Week/Day/Timeline view

---

### New Meeting
- **URL**: `/meetings/new`
- **File**: `src/app/(app)/meetings/new/page.tsx`
- **Purpose**: Schedule a new meeting with Google Meet link generation
- **Auth Required**: Yes (requires `meetings:manage` permission)
- **API Calls**: `POST /api/meetings`, Google Calendar API

---

## Documents

### Documents List
- **URL**: `/documents`
- **File**: `src/app/(app)/documents/page.tsx`
- **Purpose**: Org-wide document library
- **Auth Required**: Yes
- **Components**: Document cards, folders, search, "New Document" button

---

## AI Features

### AI Assistant
- **URL**: `/ai/assistant`
- **File**: `src/app/(app)/ai/assistant/page.tsx`
- **Purpose**: Conversational AI interface scoped to the workspace
- **Auth Required**: Yes
- **Components**: Chat interface with streaming responses, conversation history

---

### AI Reports
- **URL**: `/ai/reports`
- **File**: `src/app/(app)/ai/reports/page.tsx`
- **Purpose**: Generate AI-written project reports
- **Auth Required**: Yes (requires `analytics:view` permission)

---

### AI Health Scores
- **URL**: `/ai/health`
- **File**: `src/app/(app)/ai/health/page.tsx`
- **Purpose**: Project health scoring dashboard
- **Auth Required**: Yes

---

### AI Search
- **URL**: `/ai/search`
- **File**: `src/app/(app)/ai/search/page.tsx`
- **Purpose**: Semantic search across tasks, documents, messages
- **Auth Required**: Yes

---

## Other App Screens

| URL | File | Purpose | Min Role |
|-----|------|---------|----------|
| `/attendance` | `attendance/page.tsx` | Clock-in/out + attendance history | MEMBER |
| `/rewards` | `rewards/page.tsx` | Points, badges, leaderboard, coupons | MEMBER |
| `/workload` | `workload/page.tsx` | Team workload visualization | MANAGER |
| `/notifications` | `notifications/page.tsx` | Full notification history + preferences | MEMBER |
| `/settings` | `settings/page.tsx` | User account settings | MEMBER |
| `/admin` | `admin/page.tsx` | User, role, permissions, rewards management | ADMIN |
| `/audit` | `audit/page.tsx` | Audit log viewer | ADMIN |
| `/integrations` | `integrations/page.tsx` | Connect Slack, GitHub, WhatsApp | ADMIN |
| `/automations` | `automations/page.tsx` | Workflow automation builder | ADMIN |
| `/templates` | `templates/page.tsx` | Project templates library | MANAGER |
| `/import-export` | `import-export/page.tsx` | Import/export tasks as Excel/CSV | ADMIN |

---

## Special Routes

### Client Portal
- **URL**: `/portal/[token]`
- **File**: `src/app/portal/[token]/page.tsx`
- **Purpose**: Read-only project view for external stakeholders
- **Auth Required**: No — token-based access
- **Components**: Project overview, task status, milestones (read-only)
- **Notes**: `token` is a unique string stored in `client_portals.token`. Does not require login.
