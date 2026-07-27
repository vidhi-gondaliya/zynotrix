# ZYNOTRIX — Pages Documentation

Every page in the application, listed by route group.

---

## Root

### `/` (Root)
**File**: `src/app/page.tsx`  
**Auth Required**: No  
**Purpose**: Entry point redirect.  
**Behavior**: Middleware redirects `/` → `/dashboard` (authenticated) or `/login` (unauthenticated).

---

## Auth Group (`src/app/(auth)/`)

### `/login`
**File**: `src/app/(auth)/login/page.tsx`  
**Auth Required**: No (redirects if already logged in)  
**Purpose**: User authentication.  
**Components**: Email/password form, Google OAuth button, link to register.  
**API Calls**: NextAuth `signIn()` action.  
**Validation**: Email format, non-empty password.  
**Error States**: Invalid credentials shown inline.  
**Responsive**: Form centered, full-height mesh background.

---

### `/register`
**File**: `src/app/(auth)/register/page.tsx`  
**Auth Required**: No  
**Purpose**: New user account creation.  
**Components**: Name, email, password fields.  
**API Calls**: `POST /api/auth/register`  
**Validation**: Email uniqueness checked server-side. Password minimum length **[INCOMPLETE — no client-side validation defined]**.  
**After Success**: Auto-login + redirect to `/create-workspace`.

---

### `/create-workspace`
**File**: `src/app/(auth)/create-workspace/page.tsx`  
**Auth Required**: Yes (logged in but no org)  
**Purpose**: First-time workspace/organization setup.  
**Components**: Org name input, optional logo URL.  
**API Calls**: `POST /api/organizations`  
**After Success**: Session updated with `organizationId`, redirect to `/dashboard`.

---

## App Group (`src/app/(app)/`) — All require auth + org

### App Layout
**File**: `src/app/(app)/layout.tsx`  
**Purpose**: Shell wrapping all authenticated pages.  
**Components**: `Sidebar`, `Header`, `NotificationProvider`, `CommandPalette`, `AIChatBubble`.  
**State**: Loads project list for Command Palette. Registers `Ctrl+K` keyboard handler.

---

### `/dashboard`
**File**: `src/app/(app)/dashboard/page.tsx`  
**Purpose**: Command center overview.  
**API Calls**: `GET /api/dashboard`, `GET /api/tasks/upcoming`, `GET /api/ai/insights`  
**Components**: MetricCard × 4, AreaChart (task trend), BarChart (team activity), Recent tasks list, Status breakdown, Meetings list, AI Insights card, StandupWidget, OnboardingWizard (first visit).  
**Loading**: Skeleton grid.  
**Accessibility**: `[INCOMPLETE]` — no ARIA landmarks.

---

### `/projects`
**File**: `src/app/(app)/projects/page.tsx`  
**Purpose**: List all organization projects.  
**API Calls**: `GET /api/projects`  
**Components**: Project cards grid, status filters, "New Project" button.  
**Empty State**: "Create your first project."  
**Loading**: Project card skeletons.

---

### `/projects/new`
**File**: `src/app/(app)/projects/new/page.tsx`  
**Purpose**: Create a new project.  
**API Calls**: `POST /api/projects`, `POST /api/ai/project-description`, `POST /api/ai/project-template`  
**Components**: Project form, color picker, AI description generator, board template selector.

---

### `/projects/[projectId]/board`
**File**: `src/app/(app)/projects/[projectId]/board/page.tsx`  
**Purpose**: Kanban board view.  
**API Calls**: `GET /api/projects/[projectId]/tasks`  
**Components**: Drag-and-drop board columns, task cards, task detail modal.  
**Libraries**: `@dnd-kit/core`, `@dnd-kit/sortable`

---

### `/projects/[projectId]/list`
**File**: `src/app/(app)/projects/[projectId]/list/page.tsx`  
**Purpose**: Flat list view of project tasks.  
**API Calls**: `GET /api/projects/[projectId]/tasks`  
**Components**: Sortable table, filters, inline add row.

---

### `/projects/[projectId]/timeline`
**File**: `src/app/(app)/projects/[projectId]/timeline/page.tsx`  
**Purpose**: Gantt/calendar timeline view.  
**Libraries**: `react-big-calendar`  
**API Calls**: `GET /api/projects/[projectId]/tasks`

---

### `/projects/[projectId]/sprint`
**File**: `src/app/(app)/projects/[projectId]/sprint/page.tsx`  
**Purpose**: Sprint management for the project.  
**API Calls**: `GET /api/projects/[projectId]/sprints`, `POST .../sprints`, tasks management.

---

### `/projects/[projectId]/settings`
**File**: `src/app/(app)/projects/[projectId]/settings/page.tsx`  
**Purpose**: Project configuration.  
**Sections**: General settings, custom fields, client portal toggle, sprint settings, member management.  
**API Calls**: `PUT /api/projects/[projectId]`, custom fields APIs, client portal API.

---

### `/tasks`
**File**: `src/app/(app)/tasks/page.tsx`  
**Purpose**: Cross-project task view with filters.  
**Filters**: Mine, assigned to me, overdue, by project.  
**API Calls**: Various task endpoints.

---

### `/chat`
**File**: `src/app/(app)/chat/page.tsx`  
**Purpose**: Channel list and default channel landing.  
**Components**: Channel sidebar, empty state.

---

### `/chat/[channelId]`
**File**: `src/app/(app)/chat/[channelId]/page.tsx`  
**Purpose**: Single channel chat room.  
**API Calls**: `GET /api/channels/[channelId]/messages`, SSE stream.  
**Components**: Message list, message input, member list.

---

### `/messages`
**File**: `src/app/(app)/messages/page.tsx`  
**Purpose**: Direct message conversation list.  
**API Calls**: `GET /api/conversations`

---

### `/messages/[conversationId]`
**File**: `src/app/(app)/messages/[conversationId]/page.tsx`  
**Purpose**: 1:1 direct message thread.  
**API Calls**: `GET /api/conversations/[conversationId]/messages`, SSE stream.

---

### `/meetings`
**File**: `src/app/(app)/meetings/page.tsx`  
**Purpose**: Meeting calendar and list view.  
**API Calls**: `GET /api/meetings`  
**Libraries**: `react-big-calendar` for calendar view.

---

### `/meetings/new`
**File**: `src/app/(app)/meetings/new/page.tsx`  
**Purpose**: Schedule a new meeting.  
**API Calls**: `POST /api/meetings`, Google Calendar integration.

---

### `/documents`
**File**: `src/app/(app)/documents/page.tsx`  
**Purpose**: Document library.  
**API Calls**: `GET /api/documents`  
**Features**: Create, search, filter by personal/project.

---

### `/attendance`
**File**: `src/app/(app)/attendance/page.tsx`  
**Purpose**: Attendance tracking and history.  
**API Calls**: `/api/attendance/*`  
**Views**: My attendance, team overview (admin), weekly calendar.

---

### `/rewards`
**File**: `src/app/(app)/rewards/page.tsx`  
**Purpose**: Gamification hub.  
**API Calls**: `GET /api/rewards`  
**Tabs**: My Rewards (points + badges + activity), Leaderboard (by role), Coupons (redeem)

---

### `/admin`
**File**: `src/app/(app)/admin/page.tsx`  
**Auth**: Requires `admin:access` permission.  
**Tabs**: Users, Roles, Permissions, Rewards (reward configs + coupons)

---

### `/audit`
**File**: `src/app/(app)/audit/page.tsx`  
**Purpose**: Audit log viewer.  
**Auth**: Requires `admin:access`.  
**API Calls**: `GET /api/audit-logs`

---

### `/workload`
**File**: `src/app/(app)/workload/page.tsx`  
**Purpose**: Team capacity planning view.  
**Shows**: Tasks per member with overload indicators.

---

### `/notifications`
**File**: `src/app/(app)/notifications/page.tsx`  
**Purpose**: Full notification inbox.  
**API Calls**: `GET /api/notifications`

---

### `/settings`
**File**: `src/app/(app)/settings/page.tsx`  
**Purpose**: User profile + preferences.  
**Sections**: Profile (name, avatar), Notifications, Theme, Password change.

---

### `/integrations`
**File**: `src/app/(app)/integrations/page.tsx`  
**Purpose**: Third-party integration management.  
**Integrations**: Slack, GitHub, Google Calendar, WhatsApp, Email webhooks.

---

### `/automations`
**File**: `src/app/(app)/automations/page.tsx`  
**Purpose**: Workflow automation rules.  
**Status**: **[ALPHA]** — UI exists, execution engine incomplete.

---

### `/templates`
**File**: `src/app/(app)/templates/page.tsx`  
**Purpose**: Project template library.  
**API Calls**: `GET /api/templates`, `POST /api/templates`

---

### `/import-export`
**File**: `src/app/(app)/import-export/page.tsx`  
**Purpose**: Bulk task import from Excel, template export.

---

### `/ai/assistant`
**File**: `src/app/(app)/ai/assistant/page.tsx`  
**Purpose**: Dedicated AI chat interface.  
**Features**: Full chat history, context selection (projects, tasks).

---

### `/ai/reports`
**File**: `src/app/(app)/ai/reports/page.tsx`  
**Purpose**: AI-generated project status reports.  
**Report types**: Team report, client report, executive summary.

---

### `/ai/health`
**File**: `src/app/(app)/ai/health/page.tsx`  
**Purpose**: AI project health dashboard.  
**Features**: Health score per project, risk alerts, recommendations.

---

### `/ai/search`
**File**: `src/app/(app)/ai/search/page.tsx`  
**Purpose**: AI-powered semantic search across workspace.  
**API Calls**: `POST /api/ai/search`

---

## Portal (Public, No Auth)

### `/portal/[token]`
**File**: `src/app/portal/[token]/page.tsx`  
**Auth Required**: No  
**Purpose**: Client-facing read-only project view.  
**API Calls**: `GET /api/portal/[token]`  
**Features**: Password protection, configurable sections (tasks, health, timeline).
